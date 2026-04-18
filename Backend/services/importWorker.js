// utilService/importWorker.js
const { parentPort } = require("worker_threads");
const utilService = require("./utilService"); // adjust your path

(async () => {
    try {
        parentPort.postMessage({ progress: 5 });

        const result = await utilService.importEmployees((progress) => {
            parentPort.postMessage({ progress });
        });

        parentPort.postMessage({ success: true, result });
    } catch (err) {
        parentPort.postMessage({ success: false, error: err.toString() });
    }
})();
