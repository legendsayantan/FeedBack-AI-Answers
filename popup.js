document.getElementById('toggle').addEventListener('change', function () {
            const isEnabled = this.checked;
            // Save the toggle state to storage or perform other actions
            console.log('Extension Enabled:', isEnabled);
            chrome.storage.sync.set({ isEnabled });
        });

        document.getElementById('apiKey').addEventListener('input', function () {
            const apiKey = this.value;
            // Save the API key to storage or perform other actions
            chrome.storage.sync.set({ apiKey });
        });

        document.getElementById('modelSelect').addEventListener('change', function() {
            const selectedModel = this.value.toString().toLowerCase();
            chrome.storage.sync.set({ selectedModel: selectedModel }, function() {
                console.log('Selected Model:', selectedModel);
            });
        });

        // Load the saved settings
        chrome.storage.sync.get(['isEnabled', 'apiKey', 'selectedModel'], function (data) {
            if (data.isEnabled) {
                document.getElementById('toggle').checked = data.isEnabled;
            }
            if (data.apiKey) {
                document.getElementById('apiKey').value = data.apiKey;
            }
            if(data.selectedModel) {
                document.getElementById('modelSelect').value = data.selectedModel;
            }
        });