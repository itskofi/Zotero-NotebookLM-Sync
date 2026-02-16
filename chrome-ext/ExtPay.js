/**
 * ExtensionPay Development Stub
 *
 * This is a DEVELOPMENT-ONLY stub that mimics the ExtensionPay API.
 * Replace this file with the real ExtPay.js from https://extensionpay.com
 * before publishing to the Chrome Web Store.
 *
 * To toggle Pro mode during development, run in the background console:
 *   chrome.storage.local.set({ _devProOverride: true })
 *   chrome.storage.local.set({ _devProOverride: false })
 */

// eslint-disable-next-line no-unused-vars
function ExtPay(extensionId) {
  console.log(
    `[ExtPay Stub] Initialized for "${extensionId}" — development mode`,
  );

  return {
    startBackground() {
      // No-op in development
    },

    async getUser() {
      const data = await chrome.storage.local.get("_devProOverride");
      const paid = !!data._devProOverride;
      return {
        paid,
        paidAt: paid ? new Date().toISOString() : null,
        installedAt: new Date().toISOString(),
        trialStartedAt: null,
      };
    },

    openPaymentPage() {
      // In development, just toggle the override on
      chrome.storage.local.set({ _devProOverride: true });
      console.log(
        "[ExtPay Stub] Payment simulated — _devProOverride set to true. Reload popup to see Pro.",
      );
    },

    openTrialPage(days) {
      chrome.storage.local.set({ _devProOverride: true });
      console.log(
        `[ExtPay Stub] ${days}-day trial simulated — _devProOverride set to true.`,
      );
    },

    onPaid: {
      addListener(callback) {
        // Listen for storage changes to simulate payment events
        chrome.storage.onChanged.addListener((changes) => {
          if (
            changes._devProOverride &&
            changes._devProOverride.newValue === true
          ) {
            callback({ paid: true });
          }
        });
      },
    },
  };
}
