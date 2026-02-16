/**
 * Zotero 7 Bootstrap Plugin for NotebookLM Sync
 */

// 1. The Endpoint to LIST items
function ListEndpoint() {}
ListEndpoint.prototype = {
  supportedMethods: ["POST"],
  supportedDataTypes: ["application/json"],
  permitBookmarklet: true,

  init: function (urlObj, data, sendResponseCallback) {
    (async () => {
      try {
        // Get filters from POST data - exclusively managed by extension now
        const tag = data?.tag;
        const libraryIDStr = data?.libraryID;
        const collectionID = data?.collectionID;
        const collectionName = data?.collectionName;

        const libraryID =
          libraryIDStr && libraryIDStr !== "0"
            ? parseInt(libraryIDStr)
            : Zotero.Libraries.userLibraryID;

        let results = [];
        let collection = null;

        // Prefer collectionID if provided, fall back to collectionName
        if (collectionID) {
          try {
            collection = await Zotero.Collections.getAsync(
              parseInt(collectionID),
            );
          } catch (e) {
            Zotero.debug(
              "[NotebookLM Bridge] Collection ID not found: " + collectionID,
            );
          }
        } else if (collectionName && collectionName.trim()) {
          // Legacy: find by name
          const findCollectionByTitle = async (libID, title) => {
            const collections = await Zotero.Collections.getByLibrary(libID);
            for (let col of collections) {
              if (col.name.toLowerCase() === title.toLowerCase()) return col;
            }
            return null;
          };
          collection = await findCollectionByTitle(
            libraryID,
            collectionName.trim(),
          );
          if (!collection) {
            Zotero.debug(
              "[NotebookLM Bridge] Collection not found: " + collectionName,
            );
          }
        }

        if (collection) {
          // Get all items in this collection (recursive)
          results = await collection.getChildItems(true);

          // If a tag is also provided, filter the results manually
          if (tag && tag.trim()) {
            const taggedResults = [];
            const tagLower = tag.trim().toLowerCase();
            for (let id of results) {
              let item = await Zotero.Items.getAsync(id);
              if (
                item.getTags().some((t) => t.tag.toLowerCase() === tagLower)
              ) {
                taggedResults.push(id);
              }
            }
            results = taggedResults;
          }
        } else if (
          !collectionID &&
          !(collectionName && collectionName.trim())
        ) {
          // General library search
          const search = new Zotero.Search();
          search.libraryID = libraryID;

          if (tag && tag.trim()) {
            search.addCondition("tag", "is", tag.trim());
          }

          search.addCondition("itemType", "isNot", "attachment");
          search.addCondition("itemType", "isNot", "note");

          results = await search.search();
        }

        let fileList = [];

        for (let id of results) {
          let item = await Zotero.Items.getAsync(id);

          // Ensure we don't process attachments/notes if they came from collection.getChildItems
          if (item.isAttachment() || item.isNote()) continue;

          let attachment = await item.getBestAttachment();
          if (!attachment) continue;

          const validTypes = [
            "application/pdf",
            "text/plain",
            "text/markdown",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ];
          if (!validTypes.includes(attachment.attachmentContentType)) continue;

          let hash = "";
          try {
            hash = await Zotero.DB.valueQueryAsync(
              "SELECT fingerprint FROM itemAttachments WHERE itemID=?",
              [attachment.id],
            );
          } catch (e) {
            Zotero.debug("[NotebookLM Bridge] Failed to get fingerprint: " + e);
          }

          fileList.push({
            id: attachment.id,
            parentId: id,
            title: item.getField("title"),
            filename: attachment.attachmentFilename,
            mimeType: attachment.attachmentContentType,
            dateModified: item.dateModified,
            version: item.version,
            hash: hash || "",
          });
        }

        sendResponseCallback(200, "application/json", JSON.stringify(fileList));
      } catch (e) {
        Zotero.debug("[NotebookLM Bridge] Error listing items: " + e);
        sendResponseCallback(500, "text/plain", "Error: " + e);
      }
    })();
  },
};

// 2. POST endpoint for file - receives JSON with { id: 37 }
function FileEndpoint() {}
FileEndpoint.prototype = {
  supportedMethods: ["POST"],
  supportedDataTypes: ["application/json"],
  permitBookmarklet: true,

  init: function (urlObj, data, sendResponseCallback) {
    (async () => {
      try {
        const attachmentId = data?.id;
        if (!attachmentId) {
          sendResponseCallback(400, "text/plain", "No attachment ID provided.");
          return;
        }

        let attachment = await Zotero.Items.getAsync(parseInt(attachmentId));
        if (!attachment) {
          sendResponseCallback(404, "text/plain", "Attachment not found");
          return;
        }

        let filePath = await attachment.getFilePathAsync();
        if (!filePath || !(await IOUtils.exists(filePath))) {
          sendResponseCallback(404, "text/plain", "File not found on disk");
          return;
        }

        let fileBytes = await IOUtils.read(filePath);
        let base64 = encodeBase64(fileBytes);

        sendResponseCallback(
          200,
          "application/json",
          JSON.stringify({
            success: true,
            data: base64,
            mimeType: attachment.attachmentContentType,
          }),
        );
      } catch (e) {
        Zotero.debug("[NotebookLM Bridge] Error serving file: " + e);
        sendResponseCallback(500, "text/plain", "Error reading file: " + e);
      }
    })();
  },
};

// 3. POST endpoint for listing libraries
function LibrariesEndpoint() {}
LibrariesEndpoint.prototype = {
  supportedMethods: ["POST"],
  supportedDataTypes: ["application/json"],
  permitBookmarklet: true,

  init: function (urlObj, data, sendResponseCallback) {
    try {
      const libs = Zotero.Libraries.getAll();
      const result = libs.map((lib) => ({
        libraryID: lib.libraryID,
        name: lib.name,
        libraryType: lib.libraryType,
      }));
      sendResponseCallback(200, "application/json", JSON.stringify(result));
    } catch (e) {
      Zotero.debug("[NotebookLM Bridge] Error listing libraries: " + e);
      sendResponseCallback(500, "text/plain", "Error: " + e);
    }
  },
};

// 4. POST endpoint for listing collections in a library
function CollectionsEndpoint() {}
CollectionsEndpoint.prototype = {
  supportedMethods: ["POST"],
  supportedDataTypes: ["application/json"],
  permitBookmarklet: true,

  init: function (urlObj, data, sendResponseCallback) {
    (async () => {
      try {
        const libraryID = data?.libraryID
          ? parseInt(data.libraryID)
          : Zotero.Libraries.userLibraryID;
        const collections = await Zotero.Collections.getByLibrary(libraryID);
        const result = collections.map((col) => ({
          id: col.id,
          name: col.name,
          parentID: col.parentID || null,
        }));
        sendResponseCallback(200, "application/json", JSON.stringify(result));
      } catch (e) {
        Zotero.debug("[NotebookLM Bridge] Error listing collections: " + e);
        sendResponseCallback(500, "text/plain", "Error: " + e);
      }
    })();
  },
};

function encodeBase64(bytes) {
  let binary = "";
  const len = bytes.length;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function startup({ id, version, resourceURI, rootURI }, reason) {
  if (Zotero.initialized) {
    initPlugin(rootURI);
  } else {
    Zotero.Promise.resolve()
      .then(() => Zotero.uiReadyPromise)
      .then(() => initPlugin(rootURI));
  }
}

function initPlugin(rootURI) {
  Zotero.Server.Endpoints["/notebooklm/list"] = ListEndpoint;
  Zotero.Server.Endpoints["/notebooklm/file"] = FileEndpoint;
  Zotero.Server.Endpoints["/notebooklm/libraries"] = LibrariesEndpoint;
  Zotero.Server.Endpoints["/notebooklm/collections"] = CollectionsEndpoint;

  Zotero.debug("NotebookLM Sync: API Endpoints Registered");
}

function shutdown(data, reason) {
  delete Zotero.Server.Endpoints["/notebooklm/list"];
  delete Zotero.Server.Endpoints["/notebooklm/file"];
  delete Zotero.Server.Endpoints["/notebooklm/libraries"];
  delete Zotero.Server.Endpoints["/notebooklm/collections"];
}

function install() {}
function uninstall() {}
