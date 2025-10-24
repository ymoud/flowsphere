function parsePostmanCollection(collection) {
    // Helper: Get numeric prefix from name
    function getNumericPrefix(name) {
        const match = name.match(/^(\d+)\.\s*/);
        return match ? parseInt(match[1]) : 999999;
    }

    // Helper: Remove numeric prefix
    function removeNumericPrefix(name) {
        return name.replace(/^\d+\.\s*/, '');
    }

    // Helper: Generate camelCase ID from name
    function generateId(name) {
        const cleaned = removeNumericPrefix(name);
        const words = cleaned
            .replace(/[^a-zA-Z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 0);

        if (words.length === 0) return 'step';

        return words[0].toLowerCase() +
               words.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
    }

    // Recursively collect requests
    function collectRequests(items, folderPath = '', orderPath = []) {
        const requests = [];

        items.forEach(item => {
            if (item.item) {
                const folderName = item.name;
                const folderPrefix = getNumericPrefix(folderName);
                const cleanFolderName = removeNumericPrefix(folderName);
                const newOrderPath = [...orderPath, folderPrefix];

                const subRequests = collectRequests(
                    item.item,
                    folderPath ? `${folderPath} > ${cleanFolderName}` : cleanFolderName,
                    newOrderPath
                );
                requests.push(...subRequests);
            } else if (item.request) {
                const requestName = item.name;
                const requestPrefix = getNumericPrefix(requestName);
                const cleanRequestName = removeNumericPrefix(requestName);

                requests.push({
                    orderPath,
                    requestOrder: requestPrefix,
                    folderPath,
                    name: cleanRequestName,
                    request: item.request,
                    response: item.response || []
                });
            }
        });

        return requests;
    }

    // Collect and sort requests
    const allRequests = collectRequests(collection.item);
    allRequests.sort((a, b) => {
        const maxLen = Math.max(a.orderPath.length, b.orderPath.length);
        for (let i = 0; i < maxLen; i++) {
            const aVal = a.orderPath[i] || 0;
            const bVal = b.orderPath[i] || 0;
            if (aVal !== bVal) return aVal - bVal;
        }
        return a.requestOrder - b.requestOrder;
    });

    // Generate unique IDs
    const stepIds = [];
    const usedIds = new Set();

    allRequests.forEach((req, index) => {
        let id = generateId(req.name);
        let counter = 1;

        while (usedIds.has(id)) {
            id = generateId(req.name) + counter;
            counter++;
        }

        usedIds.add(id);
        stepIds[index] = id;
    });

    // Convert requests to steps
    const steps = allRequests.map((req, index) => {
        const step = {
            id: stepIds[index],
            name: req.name,
            method: req.request.method || 'GET',
            url: req.request.url?.raw || req.request.url || ''
        };

        // Add headers
        const headers = req.request.header || [];
        if (headers.length > 0) {
            step.headers = {};
            headers.forEach(h => {
                if (!h.disabled) {
                    step.headers[h.key] = h.value;
                }
            });
        }

        // Add body
        if (req.request.body) {
            if (req.request.body.mode === 'raw') {
                try {
                    step.body = JSON.parse(req.request.body.raw);
                } catch (e) {
                    step.body = req.request.body.raw;
                }
            }
        }

        return step;
    });

    // Build config
    return {
        enableDebug: false,
        defaults: {
            baseUrl: '',
            timeout: 30,
            headers: {
                'Content-Type': 'application/json'
            },
            validations: [
                { status: 200 }
            ]
        },
        steps: steps
    };
}
