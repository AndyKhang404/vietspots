import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { haversineDistance, twoOptOrder, type LatLng } from "@/lib/routeUtils";
import { Shuffle, RefreshCcw } from "lucide-react";

type Place = {
    place_id?: string;
    id?: string;
    name?: string;
    latitude?: number;
    longitude?: number;
};

export default function RouteOptimizer({
    activities,
    onReorder,
}: {
    activities: { time?: string; place: Place }[];
    onReorder: (newActivities: { time?: string; place: Place }[]) => void;
}) {
    const [busy, setBusy] = useState(false);

    const compute = () => {
        setBusy(true);
        try {
            const points: LatLng[] = activities.map((a) => ({
                latitude: a.place.latitude ?? NaN,
                longitude: a.place.longitude ?? NaN,
            }));

            if (points.some((p) => Number.isNaN(p.latitude) || Number.isNaN(p.longitude))) {
                toast.error("Một số địa điểm không có tọa độ — không thể tối ưu hóa tự động.");
                setBusy(false);
                return;
            }

            const initialDistance = points.reduce((acc, _, i) => {
                if (i === points.length - 1) return acc;
                return acc + haversineDistance(points[i], points[i + 1]);
            }, 0);

            const order = twoOptOrder(points);

            const reordered = order.map((idx) => activities[idx]);

            const newPoints = order.map((i) => points[i]);
            const optimizedDistance = newPoints.reduce((acc, _, i) => {
                if (i === newPoints.length - 1) return acc;
                return acc + haversineDistance(newPoints[i], newPoints[i + 1]);
            }, 0);

            onReorder(reordered);
            toast.success(`Tối ưu xong — tiết kiệm ~${Math.max(0, (initialDistance - optimizedDistance)).toFixed(2)} km`);
        } catch (e) {
            console.error(e);
            toast.error("Lỗi khi tối ưu lộ trình");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={compute} disabled={busy} className="gap-2">
                <Shuffle className="h-4 w-4" /> Sắp xếp lộ trình
            </Button>
            <Button variant="outline" size="sm" onClick={() => onReorder(activities)} className="gap-2">
                <RefreshCcw className="h-4 w-4" /> Hoàn tác
            </Button>
        </div>
    );
}
