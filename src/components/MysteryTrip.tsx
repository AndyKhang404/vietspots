import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { allPlaces, type Place } from "@/data/places";
import { toast } from "sonner";
import { cleanAddress } from "@/lib/utils";

export default function MysteryTrip() {
    const [district, setDistrict] = useState("");
    const [budget, setBudget] = useState("medium");
    const [vibe, setVibe] = useState("");
    const [selected, setSelected] = useState<Place | null>(null);
    const [revealed, setRevealed] = useState(false);
    const watchId = useRef<number | null>(null);

    const start = () => {
        // normalize helper (remove diacritics, lower-case)
        const normalize = (s?: string) =>
            (s || "")
                .toString()
                .normalize("NFD")
                .replace(/\p{Diacritic}/gu, "")
                .replace(/[^a-z0-9\s]/gi, " ")
                .toLowerCase()
                .trim();

        const stripDistrictWord = (s: string) => s.replace(/\b(quận|quan|q\.?|district)\b/gi, "").trim();

        const userInput = stripDistrictWord(district || "");
        const normalizedInput = normalize(userInput);

        let filtered = allPlaces.filter((p) => {
            if (!normalizedInput) return true;

            const combined = `${p.address || ""} ${p.location || ""} ${p.name || ""}`;
            const normalized = normalize(stripDistrictWord(combined));
            return normalized.includes(normalizedInput);
        });

        if (filtered.length === 0) {
            // Try a looser match: match numbers alone (e.g., user typed '5' for 'Quận 5')
            const digits = (district || "").match(/\d+/)?.[0];
            if (digits) {
                filtered = allPlaces.filter((p) => {
                    const combined = `${p.address || ""} ${p.location || ""} ${p.name || ""}`;
                    return combined.includes(digits);
                });
            }
        }

        if (filtered.length === 0) {
            // fallback: choose from all places but inform the user
            toast.error("Không tìm thấy địa điểm phù hợp — sẽ chọn ngẫu nhiên từ toàn bộ danh sách.");
            filtered = allPlaces;
        }

        const choice = filtered[Math.floor(Math.random() * filtered.length)];
        // sanitize address before showing
        const sanitizedChoice = { ...choice, address: cleanAddress((choice as any).address) } as Place;
        setSelected(sanitizedChoice);
        setRevealed(false);
        toast.message("Đã chọn địa điểm bí mật. Hệ thống sẽ theo dõi vị trí của bạn.");

        // start geolocation watch
        if (navigator.geolocation) {
            watchId.current = navigator.geolocation.watchPosition(
                (pos) => {
                    if (!choice.latitude || !choice.longitude) return;
                    const toRad = (v: number) => (v * Math.PI) / 180;
                    const R = 6371;
                    const dLat = toRad(choice.latitude - pos.coords.latitude);
                    const dLon = toRad(choice.longitude - pos.coords.longitude);
                    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(pos.coords.latitude)) * Math.cos(toRad(choice.latitude)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    const km = R * c;
                    if (km <= 0.1 && !revealed) {
                        setRevealed(true);
                        toast.success("Bạn đã đến gần — tên địa điểm đã được tiết lộ.");
                        if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
                    }
                },
                (err) => {
                    console.warn(err);
                },
                { enableHighAccuracy: true, maximumAge: 5000 }
            );
        }
    };

    useEffect(() => {
        return () => {
            if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
        };
    }, []);

    return (
        <div className="bg-card rounded-2xl p-4 border border-border mt-6">
            <h3 className="font-semibold mb-2">Thử thách Du lịch Mù</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input placeholder="Quận (ví dụ: Quận 1)" value={district} onChange={(e) => setDistrict(e.target.value)} />
                <Select value={budget} onValueChange={(v) => setBudget(v)}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="low">50k/người</SelectItem>
                        <SelectItem value="medium">~100k/người</SelectItem>
                        <SelectItem value="high">Cao</SelectItem>
                    </SelectContent>
                </Select>
                <Input placeholder="Vibe (ví dụ: Yên tĩnh)" value={vibe} onChange={(e) => setVibe(e.target.value)} />
            </div>

            <div className="mt-3 flex gap-2">
                <Button onClick={start}>Giao phó cho định mệnh</Button>
                <Button variant="ghost" onClick={() => { setSelected(null); setRevealed(false); if (watchId.current !== null) { navigator.geolocation.clearWatch(watchId.current); watchId.current = null; } }}>Hủy</Button>
            </div>

            {selected && (
                <div className="mt-4">
                    <p className="text-sm text-muted-foreground">Địa điểm bí mật đã được chọn. Tên sẽ hiện khi bạn tới nơi.</p>
                    <div className="mt-3 flex items-center gap-3">
                        <div className="flex-1">
                            <div className="font-medium">
                                {revealed ? selected.name : "(Bí mật)"}
                            </div>
                            <div className="text-sm text-muted-foreground">{selected.location}</div>
                        </div>
                        {selected.latitude && selected.longitude && (
                            <a href={`https://www.google.com/maps/dir/?api=1&destination=${selected.latitude},${selected.longitude}`} target="_blank" rel="noreferrer">
                                <Button variant="outline">Đi đến</Button>
                            </a>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
