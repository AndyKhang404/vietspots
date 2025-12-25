export type LatLng = { latitude: number; longitude: number };

export function haversineDistance(a: LatLng, b: LatLng) {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);

    const sinDLat = Math.sin(dLat / 2);
    const sinDLon = Math.sin(dLon / 2);
    const aa = sinDLat * sinDLat + sinDLon * sinDLon * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
    return R * c;
}

function totalRouteDistance(points: LatLng[], order: number[]) {
    let d = 0;
    for (let i = 0; i < order.length - 1; i++) {
        d += haversineDistance(points[order[i]], points[order[i + 1]]);
    }
    return d;
}

// Simple 2-opt local search for small n (5-15) - deterministic and fast
export function twoOptOrder(points: LatLng[], startIndex = 0) {
    const n = points.length;
    if (n <= 2) return Array.from({ length: n }, (_, i) => i);

    // initial order: as-is, but rotate so startIndex is first
    let order = Array.from({ length: n }, (_, i) => i);
    if (startIndex !== 0) order = order.slice(startIndex).concat(order.slice(0, startIndex));

    let improved = true;
    while (improved) {
        improved = false;
        for (let i = 1; i < n - 1; i++) {
            for (let k = i + 1; k < n; k++) {
                const newOrder = order.slice(0, i).concat(order.slice(i, k + 1).reverse()).concat(order.slice(k + 1));
                if (totalRouteDistance(points, newOrder) + 1e-6 < totalRouteDistance(points, order)) {
                    order = newOrder;
                    improved = true;
                }
            }
        }
    }

    // rotate back so original start index corresponds to first element
    return order.map((idx) => idx);
}
