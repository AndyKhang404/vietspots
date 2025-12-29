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

            // Recompute times for reordered activities.
            // Determine a sensible start time: earliest parseable time among original activities, else 08:00.
            const parseTimeToMinutes = (s?: string) => {
                if (!s) return null;
                const m = s.match(/(\d{1,2}):(\d{2})/);
                if (!m) return null;
                const h = parseInt(m[1], 10);
                const min = parseInt(m[2], 10);
                return h * 60 + min;
            };

            const parseDurationToMinutes = (s?: string) => {
                if (!s) return null;
                const str = s.toString().toLowerCase();
                // hours like '2 giờ', '2h', '2.5h'
                const hMatch = str.match(/(\d+[\.,]?\d*)\s*(h|giờ)/);
                if (hMatch) return Math.round(parseFloat(hMatch[1].replace(',', '.')) * 60);
                // minutes like '90 phút' or '90p'
                const mMatch = str.match(/(\d+)\s*(phút|p|min)/);
                if (mMatch) return parseInt(mMatch[1], 10);
                return null;
            };

            const formatMinutes = (mins: number) => {
                const h = Math.floor((mins % (24 * 60)) / 60);
                const m = mins % 60;
                return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            };

            // Find earliest time among original activities
            const originalTimes = activities.map((a) => parseTimeToMinutes(a.time)).filter((v) => v !== null) as number[];
            const startMinutes = originalTimes.length > 0 ? Math.min(...originalTimes) : 8 * 60;

            // Determine default increment from first duration found, else 120 minutes
            const durations = activities.map((a) => parseDurationToMinutes((a as any).duration)).filter((v) => v !== null) as number[];
            const defaultIncrement = durations.length > 0 ? Math.round(durations.reduce((s, v) => s + v, 0) / durations.length) : 120;

            let current = startMinutes;
            const reorderedWithTimes = reordered.map((act, idx) => {
                // prefer existing duration for this activity, else defaultIncrement
                const dur = parseDurationToMinutes((act as any).duration) || defaultIncrement;
                const newAct = { ...act, time: formatMinutes(current) };
                current += dur;
                return newAct;
            });

            const newPoints = order.map((i) => points[i]);
            const optimizedDistance = newPoints.reduce((acc, _, i) => {
                if (i === newPoints.length - 1) return acc;
                return acc + haversineDistance(newPoints[i], newPoints[i + 1]);
            }, 0);

            onReorder(reorderedWithTimes);
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
