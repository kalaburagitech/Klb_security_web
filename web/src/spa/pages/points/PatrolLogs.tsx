import { useCallback, useEffect, useMemo, useState } from "react";
import { useConvex, useQuery } from "convex/react";
import { api } from "../../../services/convex";
import { FileSpreadsheet, FileText, Loader2, MapPin, X } from "lucide-react";
import { cn } from "../../../lib/utils";
import { useUser } from "@clerk/nextjs";
import type { Id } from "../../../../convex/_generated/dataModel";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const PAGE_SIZE = 25;

function parseLocalDayEnd(iso: string): number {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

function parseLocalDayStart(iso: string): number {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

function defaultToIso(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function formatDurationMs(ms: number): string {
    if (!ms || ms < 0) return "—";
    const m = Math.floor(ms / 60000);
    const h = Math.floor(m / 60);
    const min = m % 60;
    if (h > 0) return `${h}h ${min}m`;
    return `${min} min`;
}

export default function PatrolLogs() {
    const { user } = useUser();
    const convex = useConvex();
    const [detailSessionId, setDetailSessionId] = useState<Id<"patrolSessions"> | null>(null);
    const [pageIndex, setPageIndex] = useState(0);
    const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);

    const today = new Date();
    const defaultFrom = new Date(today);
    defaultFrom.setDate(defaultFrom.getDate() - 60);

    const [fromDate, setFromDate] = useState(defaultToIso(defaultFrom));
    const [toDate, setToDate] = useState(defaultToIso(today));
    const [selectedRegionId, setSelectedRegionId] = useState("");
    const [selectedCity, setSelectedCity] = useState("");
    const [selectedSiteId, setSelectedSiteId] = useState("");

    const currentUser = useQuery(
        api.users.getByClerkId,
        user?.id ? { clerkId: user.id } : "skip"
    );
    const organizationId = currentUser?.organizationId;
    const regions = useQuery(api.regions.list, {});

    /** Full region list: user can change away from their default. */
    const regionOptions = useMemo(() => regions ?? [], [regions]);

    /** Pre-select signed-in user's region once; they may change the dropdown anytime. */
    useEffect(() => {
        if (!currentUser?.regionId || selectedRegionId) return;
        setSelectedRegionId(currentUser.regionId);
    }, [currentUser?.regionId, selectedRegionId]);

    const sitesInRegion = useQuery(
        api.sites.listSitesByOrg,
        organizationId && selectedRegionId
            ? { organizationId, regionId: selectedRegionId }
            : "skip"
    );

    const citiesInRegion = useMemo(() => {
        const set = new Set<string>();
        for (const s of sitesInRegion ?? []) {
            if ((s as { city?: string }).city) set.add((s as { city?: string }).city!);
        }
        return Array.from(set).sort();
    }, [sitesInRegion]);

    const filteredSites = useMemo(() => {
        let list = sitesInRegion ?? [];
        if (selectedCity) {
            list = list.filter((s: { city?: string }) => s.city === selectedCity);
        }
        return list;
    }, [sitesInRegion, selectedCity]);

    useEffect(() => {
        if (selectedCity && !citiesInRegion.includes(selectedCity)) {
            setSelectedCity("");
        }
    }, [citiesInRegion, selectedCity]);

    useEffect(() => {
        if (selectedSiteId && !filteredSites.some((s: { _id: string }) => s._id === selectedSiteId)) {
            setSelectedSiteId("");
        }
    }, [filteredSites, selectedSiteId]);

    const fromMs = useMemo(() => parseLocalDayStart(fromDate), [fromDate]);
    const toMs = useMemo(() => parseLocalDayEnd(toDate), [toDate]);

    const siteIdsForQuery = useMemo((): Id<"sites">[] | undefined => {
        if (!filteredSites.length) return undefined;
        if (selectedSiteId) {
            return [selectedSiteId as Id<"sites">];
        }
        return filteredSites.map((s: { _id: string }) => s._id as Id<"sites">);
    }, [filteredSites, selectedSiteId]);

    const roundsPage = useQuery(
        api.patrolSessions.listPatrolRoundsPage,
        organizationId &&
            selectedRegionId &&
            filteredSites.length > 0 &&
            fromMs <= toMs
            ? {
                  organizationId,
                  fromMs,
                  toMs,
                  siteIds: siteIdsForQuery,
                  offset: pageIndex * PAGE_SIZE,
                  limit: PAGE_SIZE,
              }
            : "skip"
    );

    const sessionDetail = useQuery(
        api.patrolSessions.getSessionDetail,
        detailSessionId ? { sessionId: detailSessionId } : "skip"
    );

    useEffect(() => {
        setPageIndex(0);
    }, [fromDate, toDate, selectedRegionId, selectedCity, selectedSiteId, organizationId]);

    const totalPages = useMemo(() => {
        const t = roundsPage?.total ?? 0;
        return Math.max(1, Math.ceil(t / PAGE_SIZE));
    }, [roundsPage?.total]);

    const runExport = useCallback(
        async (kind: "csv" | "pdf") => {
            if (!organizationId || !selectedRegionId || !filteredSites.length || fromMs > toMs) return;
            setExporting(kind);
            try {
                const { items, truncated, totalMatching } = await convex.query(
                    api.patrolSessions.listPatrolRoundsExport,
                    {
                        organizationId,
                        fromMs,
                        toMs,
                        siteIds: siteIdsForQuery,
                        maxRows: 2500,
                    }
                );

                const headers = [
                    "Site",
                    "Region",
                    "City",
                    "Officer",
                    "Emp ID",
                    "Started",
                    "Ended",
                    "Duration",
                    "Scans",
                    "Distance m",
                    "Route",
                ];

                const rows = items.map((r: (typeof items)[number]) => [
                    r.siteName,
                    r.regionId ?? "",
                    r.city ?? "",
                    r.guardName,
                    r.guardEmpId ?? "",
                    new Date(r.startTime).toLocaleString(),
                    r.endTime ? new Date(r.endTime).toLocaleString() : "",
                    formatDurationMs(r.durationMs),
                    String(r.scanCount),
                    String(r.totalDistanceM),
                    r.pointTrail ?? "",
                ]);

                const stamp = `${fromDate}_to_${toDate}`;
                if (kind === "csv") {
                    const esc = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
                    const csv = [headers.map(esc).join(","), ...rows.map((row) => row.map(esc).join(","))].join("\n");
                    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `patrol-rounds-${stamp}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                } else {
                    const doc = new jsPDF({ orientation: "landscape" });
                    doc.setFontSize(11);
                    doc.text(`Patrol rounds ${fromDate} → ${toDate}`, 14, 16);
                    doc.setFontSize(9);
                    doc.text(
                        `Rows: ${items.length} of ${totalMatching}${truncated ? " (truncated at 2500)" : ""}`,
                        14,
                        22
                    );
                    autoTable(doc, {
                        startY: 26,
                        head: [headers],
                        body: rows,
                        styles: { fontSize: 7, cellPadding: 1.5 },
                        headStyles: { fillColor: [30, 41, 59] },
                    });
                    doc.save(`patrol-rounds-${stamp}.pdf`);
                }
            } finally {
                setExporting(null);
            }
        },
        [
            convex,
            organizationId,
            selectedRegionId,
            filteredSites.length,
            fromMs,
            toMs,
            siteIdsForQuery,
            fromDate,
            toDate,
        ]
    );

    if (currentUser === undefined || regions === undefined) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    if (!organizationId) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-sm text-center max-w-md mx-auto">
                Join or set up an organization to view patrol rounds.
            </div>
        );
    }

    const loadingPage = roundsPage === undefined && selectedRegionId && filteredSites.length > 0;
    const items = roundsPage?.items ?? [];
    const total = roundsPage?.total ?? 0;

    return (
        <>
            <div className="w-full max-w-[100%] space-y-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Patrol rounds</h2>
                        <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                            Completed patrol sessions (ended in the date range), scoped to your region and sites. Pick
                            region first — cities and sites load only for that region to keep the list fast.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                        <button
                            type="button"
                            disabled={
                                exporting !== null ||
                                !selectedRegionId ||
                                !filteredSites.length ||
                                fromMs > toMs
                            }
                            onClick={() => runExport("csv")}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40"
                        >
                            {exporting === "csv" ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <FileSpreadsheet className="h-3.5 w-3.5" />
                            )}
                            CSV
                        </button>
                        <button
                            type="button"
                            disabled={
                                exporting !== null ||
                                !selectedRegionId ||
                                !filteredSites.length ||
                                fromMs > toMs
                            }
                            onClick={() => runExport("pdf")}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/20 disabled:opacity-40"
                        >
                            {exporting === "pdf" ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <FileText className="h-3.5 w-3.5" />
                            )}
                            PDF
                        </button>
                    </div>
                </div>

                <div className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
                    <label className="space-y-1 lg:col-span-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            From
                        </span>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white"
                        />
                    </label>
                    <label className="space-y-1 lg:col-span-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            To
                        </span>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white"
                        />
                    </label>
                    <label className="space-y-1 lg:col-span-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Region
                        </span>
                        <select
                            value={selectedRegionId}
                            onChange={(e) => {
                                setSelectedRegionId(e.target.value);
                                setSelectedCity("");
                                setSelectedSiteId("");
                            }}
                            className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white outline-none focus:border-primary"
                        >
                            <option value="">Select region</option>
                            {regionOptions.map((r: { _id: string; regionId: string; regionName: string }) => (
                                <option key={r._id} value={r.regionId}>
                                    {r.regionName}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="space-y-1 lg:col-span-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            City
                        </span>
                        <select
                            value={selectedCity}
                            onChange={(e) => {
                                setSelectedCity(e.target.value);
                                setSelectedSiteId("");
                            }}
                            disabled={!selectedRegionId}
                            className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white outline-none focus:border-primary disabled:opacity-40"
                        >
                            <option value="">All cities</option>
                            {citiesInRegion.map((city) => (
                                <option key={city} value={city}>
                                    {city}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="space-y-1 lg:col-span-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Site
                        </span>
                        <select
                            value={selectedSiteId}
                            onChange={(e) => setSelectedSiteId(e.target.value)}
                            disabled={!selectedRegionId}
                            className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white outline-none focus:border-primary disabled:opacity-40"
                        >
                            <option value="">All sites ({filteredSites.length})</option>
                            {filteredSites.map((s: { _id: string; name: string }) => (
                                <option key={s._id} value={s._id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                {fromMs > toMs && (
                    <p className="text-xs text-amber-500">“From” date must be on or before “To” date.</p>
                )}

                {!selectedRegionId && (
                    <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-white/10 p-4">
                        Select a region to load sites and patrol rounds.
                    </p>
                )}

                {selectedRegionId && sitesInRegion !== undefined && filteredSites.length === 0 && (
                    <p className="text-xs text-muted-foreground">No sites in this region (and city filter).</p>
                )}

                {loadingPage && (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-7 h-7 text-primary animate-spin" />
                    </div>
                )}

                {!loadingPage && selectedRegionId && filteredSites.length > 0 && fromMs <= toMs && (
                    <>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                            <span>
                                <span className="text-white/80 font-medium">{total}</span> session
                                {total === 1 ? "" : "s"} · page{" "}
                                <span className="text-white/80 font-medium">{pageIndex + 1}</span> / {totalPages}
                            </span>
                            <div className="flex gap-1">
                                <button
                                    type="button"
                                    disabled={pageIndex <= 0}
                                    onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                                    className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-white hover:bg-white/5 disabled:opacity-30"
                                >
                                    Prev
                                </button>
                                <button
                                    type="button"
                                    disabled={!roundsPage?.hasMore}
                                    onClick={() => setPageIndex((p) => p + 1)}
                                    className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-white hover:bg-white/5 disabled:opacity-30"
                                >
                                    Next
                                </button>
                            </div>
                        </div>

                        <div className="w-full overflow-x-auto rounded-xl border border-white/10">
                            <table className="w-full min-w-[900px] text-left text-[11px]">
                                <thead>
                                    <tr className="border-b border-white/10 bg-white/[0.03] text-[10px] uppercase tracking-wider text-muted-foreground">
                                        <th className="px-2 py-2 font-semibold">Site</th>
                                        <th className="px-2 py-2 font-semibold">City</th>
                                        <th className="px-2 py-2 font-semibold">Officer</th>
                                        <th className="px-2 py-2 font-semibold">Ended</th>
                                        <th className="px-2 py-2 font-semibold">Dur</th>
                                        <th className="px-2 py-2 font-semibold">#</th>
                                        <th className="px-2 py-2 font-semibold">m</th>
                                        <th className="px-2 py-2 font-semibold min-w-[180px]">Route</th>
                                        <th className="px-2 py-2 font-semibold text-right"> </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.06]">
                                    {items.map((r: (typeof items)[number]) => (
                                        <tr key={r.sessionId} className="hover:bg-white/[0.02]">
                                            <td className="px-2 py-1.5 text-white/90 font-medium">{r.siteName}</td>
                                            <td className="px-2 py-1.5 text-muted-foreground">{r.city ?? "—"}</td>
                                            <td className="px-2 py-1.5">
                                                <div className="text-white/85 leading-tight">{r.guardName}</div>
                                                <div className="text-[10px] text-muted-foreground">{r.guardEmpId}</div>
                                            </td>
                                            <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap">
                                                {r.endTime ? new Date(r.endTime).toLocaleString() : "—"}
                                            </td>
                                            <td className="px-2 py-1.5 text-emerald-400/90 whitespace-nowrap">
                                                {formatDurationMs(r.durationMs)}
                                            </td>
                                            <td className="px-2 py-1.5 text-white/70">{r.scanCount}</td>
                                            <td className="px-2 py-1.5 text-white/70">{r.totalDistanceM}</td>
                                            <td className="px-2 py-1.5 text-slate-400 max-w-[320px] truncate" title={r.pointTrail}>
                                                {r.pointTrail || "—"}
                                            </td>
                                            <td className="px-2 py-1.5 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setDetailSessionId(r.sessionId as Id<"patrolSessions">)
                                                    }
                                                    className="text-[10px] font-bold uppercase text-primary hover:underline"
                                                >
                                                    Open
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {items.length === 0 && (
                                        <tr>
                                            <td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">
                                                No patrol rounds in this range for the selected sites.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {detailSessionId ? (
                <div
                    className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    onClick={() => setDetailSessionId(null)}
                >
                    <div
                        className="max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-neutral-950 p-5 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-start gap-4">
                            <h3 className="text-lg font-bold text-white">Patrol round</h3>
                            <button
                                type="button"
                                onClick={() => setDetailSessionId(null)}
                                className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        {sessionDetail === undefined ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="w-7 h-7 text-primary animate-spin" />
                            </div>
                        ) : sessionDetail === null ? (
                            <p className="text-sm text-red-400 mt-3">Could not load this session.</p>
                        ) : (
                            <>
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {sessionDetail.siteName}
                                </p>
                                <p className="text-sm text-white mt-3 font-semibold">
                                    {sessionDetail.guardName}{" "}
                                    <span className="text-muted-foreground font-normal text-xs">
                                        · {sessionDetail.guardEmpId}
                                    </span>
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                                    {formatDurationMs(sessionDetail.session.durationMs)} · {sessionDetail.scanCount} scans ·{" "}
                                    {sessionDetail.totalDistanceM} m · {sessionDetail.uniqueScannedPoints} /{" "}
                                    {sessionDetail.totalSitePoints} points
                                </p>
                                <div className="mt-4 space-y-3">
                                    {(sessionDetail.logs || []).map((log: any) => (
                                        <div
                                            key={log.logId}
                                            className="rounded-lg border border-white/10 p-3 bg-white/[0.02] text-xs"
                                        >
                                            <div className="flex justify-between gap-2 flex-wrap">
                                                <span className="font-bold text-white">
                                                    #{log.order} {log.pointName}
                                                </span>
                                                <span
                                                    className={cn(
                                                        "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border",
                                                        log.withinRange
                                                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                                                            : "bg-red-500/15 text-red-300 border-red-500/25"
                                                    )}
                                                >
                                                    {log.withinRange ? "In range" : "Far"}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground mt-1">
                                                {new Date(log.createdAt).toLocaleString()}
                                            </p>
                                            <p className="text-[10px] text-slate-400 mt-1">
                                                {typeof log.distance === "number" ? log.distance.toFixed(1) : log.distance}{" "}
                                                m (allowed {log.allowedRadiusM ?? 200} m)
                                            </p>
                                            {log.comment ? (
                                                <p className="text-slate-300 mt-2 leading-snug">{log.comment}</p>
                                            ) : null}
                                            {log.imageUrl ? (
                                                <img
                                                    src={log.imageUrl}
                                                    alt=""
                                                    className="mt-2 rounded-md max-h-40 w-full object-contain bg-black/40"
                                                />
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            ) : null}
        </>
    );
}
