"use client";
import React, { useMemo, useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Header from "@/components/Header";
import { Calendar, Printer, BookOpen, Clock, Loader2, Wallet, IndianRupee, FileText, MessageSquare, User, Users, Eye, Plane, List, LayoutGrid, Search, Bell, Download, Trophy, Award, Camera, Newspaper, Megaphone, Edit2, CheckCircle, XCircle, AlertTriangle, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import UpdateCard from "@/components/UpdateCard";
import ProfileEditModal from "./ProfileEditModal";
import html2canvas from "html2canvas";
import { cn, formatDateForDisplay, formatMonthYear, formatDateShort, formatDate } from "@/lib/utils";
import useCrud from "@/hooks/use-crud";
import TableComponent from "@/components/TableComponent";
import Barcode from "react-barcode";
import PrintHeader from "@/components/PrintHeader";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import { Button } from "./ui/button";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { saveAs } from "file-saver";





const formatDateWithoutDay = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const ProfileField = ({ label, subLabel, value, isBold }) =>
  (value || value === 0 || typeof value === 'string') ? (
    <>
      <div className="flex flex-col py-1">
        <span className={`text-sm font-medium ${isBold ? 'font-bold' : 'text-muted-foreground'}`}>{label}</span>
        {subLabel && <span className="text-xs text-muted-foreground">{subLabel}</span>}
      </div>
      <div className="text-sm px-1 py-1">:</div>
      <div className={`text-sm ${isBold ? 'font-bold' : 'text-foreground'} min-w-0 break-words py-1`}>{value}</div>
    </>
  ) : null;

function DownloadsTabContent({ apiKey }) {
  React.useEffect(() => {
    console.log("DownloadsTabContent initialized with apiKey:", apiKey ? "Present" : "Missing");
  }, [apiKey]);

  const [activeSubTab, setActiveSubTab] = React.useState("PAPERS");


  // -- Question Papers --
  const [papers, setPapers] = React.useState([]);
  const [papersLoading, setPapersLoading] = React.useState(false);
  const [papersLoaded, setPapersLoaded] = React.useState(false);

  // -- Syllabus --
  const [syllabuses, setSyllabuses] = React.useState([]);
  const [syllabusLoading, setSyllabusLoading] = React.useState(false);
  const [syllabusLoaded, setSyllabusLoaded] = React.useState(false);

  // -- Books --
  const [books, setBooks] = React.useState([]);
  const [booksLoading, setBooksLoading] = React.useState(false);
  const [booksLoaded, setBooksLoaded] = React.useState(false);

  // Lazy-load each tab's data only when first opened
  React.useEffect(() => {
    if (activeSubTab === "PAPERS" && !papersLoaded && apiKey) {
      setPapersLoading(true);
      fetch("/api/downloads", { headers: { "api-key": apiKey } })
        .then(r => r.json())
        .then(d => { setPapers(d.downloads || []); setPapersLoaded(true); })
        .catch(e => console.error("Papers fetch error:", e))
        .finally(() => setPapersLoading(false));
    }
    if (activeSubTab === "SYLLABUS" && !syllabusLoaded && apiKey) {
      setSyllabusLoading(true);
      fetch("/api/syllabus", { headers: { "api-key": apiKey } })
        .then(r => r.json())
        .then(d => { setSyllabuses(d.syllabuses || []); setSyllabusLoaded(true); })
        .catch(e => console.error("Syllabus fetch error:", e))
        .finally(() => setSyllabusLoading(false));
    }
    if (activeSubTab === "BOOKS" && !booksLoaded && apiKey) {
      setBooksLoading(true);
      fetch("/api/books", { headers: { "api-key": apiKey } })
        .then(r => r.json())
        .then(d => { setBooks(d.books || []); setBooksLoaded(true); })
        .catch(e => console.error("Books fetch error:", e))
        .finally(() => setBooksLoading(false));
    }
  }, [activeSubTab, apiKey]);

  const [downloadingId, setDownloadingId] = React.useState(null);
  const [previewItem, setPreviewItem] = React.useState(null); // { url, title }

  const handleDownload = async (fileUrl, filename, downloadId) => {
    if (!fileUrl) return;
    setDownloadingId(downloadId);
    console.log("[Download] Starting:", filename);
    console.log("[Download] apiKey present:", !!apiKey);
    console.log("[Download] fileUrl:", fileUrl);
    try {
      let url = fileUrl;
      // Force PDF transformation only for Cloudinary images (avoiding raw files like .docx)
      if (url.includes("cloudinary.com") && url.includes("/image/upload/") && !url.toLowerCase().endsWith(".pdf")) {
        const parts = url.split("/upload/");
        if (parts.length === 2) {
          url = `${parts[0]}/upload/f_pdf/${parts[1].replace(/\.[^/.]+$/, ".pdf")}`;
        }
      }

      const proxyUrl = `/api/download-file?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
      console.log("[Download] proxyUrl:", proxyUrl);

      const response = await fetch(proxyUrl, {
        headers: { "api-key": apiKey || "" }
      });

      console.log("[Download] response.status:", response.status);
      console.log("[Download] response.ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error("[Download] Error status:", response.status);
        console.error("[Download] Error content-type:", response.headers.get("content-type"));
        console.error("[Download] Error body:", errorText.substring(0, 500));

        let errorMessage = `Server error (${response.status})`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          // not JSON
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      console.log("[Download] Blob size:", blob.size, "type:", blob.type);
      saveAs(blob, filename);
      toast.success("Download started!");
    } catch (error) {
      console.error("Download failed:", error);
      toast.error(error.message || "Failed to download file");
    } finally {

      setDownloadingId(null);
    }
  };


  const subTabs = [
    { id: "PAPERS", label: "Question Papers", icon: FileText, color: "text-teal-600 dark:text-teal-400", activeBg: "bg-teal-50 dark:bg-teal-900/20 border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300" },
    { id: "SYLLABUS", label: "Syllabus", icon: BookOpen, color: "text-indigo-600 dark:text-indigo-400", activeBg: "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300" },
    { id: "BOOKS", label: "Books", icon: BookOpen, color: "text-amber-600 dark:text-amber-400", activeBg: "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300" },
  ];

  const EmptyState = ({ icon: Icon, color, label }) => (
    <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
      <div className={`p-5 rounded-2xl mb-4 bg-muted/30`}>
        <Icon className={`h-10 w-10 opacity-40 ${color}`} />
      </div>
      <p className="text-sm font-semibold mb-1">No {label} Available</p>
      <p className="text-xs text-muted-foreground">Nothing has been uploaded yet.</p>
    </div>
  );

  const LoadingState = () => (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* PDF Preview Dialog */}
      <Dialog open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
        <DialogContent className="max-w-4xl w-full h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-4 py-3 border-b shrink-0">
            <DialogTitle className="text-sm font-semibold truncate">{previewItem?.title || "Preview"}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {previewItem?.url && (
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewItem.url)}&embedded=true`}
                className="w-full h-full border-0"
                title={previewItem?.title || "Document Preview"}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Sub-tab Switcher */}
      <div className="flex gap-2 border-b pb-3 overflow-x-auto no-scrollbar">

        {subTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all duration-200 ${
                isActive
                  ? tab.activeBg
                  : "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "" : tab.color}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Question Papers */}
      {activeSubTab === "PAPERS" && (
        papersLoading ? <LoadingState /> :
        !papers.length ? <EmptyState icon={FileText} color="text-teal-500" label="Question Papers" /> :
        <div className="rounded-md border overflow-hidden overflow-x-auto">
          <Table className="min-w-[500px]">

            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="py-3 text-xs font-bold uppercase w-[50px]">No</TableHead>
                <TableHead className="py-3 text-xs font-bold uppercase">Course</TableHead>
                <TableHead className="py-3 text-xs font-bold uppercase">Year</TableHead>
                <TableHead className="py-3 text-xs font-bold uppercase">Sem</TableHead>
                <TableHead className="py-3 text-xs font-bold uppercase">Subject</TableHead>
                <TableHead className="py-3 text-xs font-bold uppercase text-right">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {papers.map((d, idx) => (
                <TableRow key={d._id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="py-2.5 text-sm text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="py-2.5 text-sm">{d.course}</TableCell>
                  <TableCell className="py-2.5 text-sm">Year {d.year}</TableCell>
                  <TableCell className="py-2.5 text-sm">Sem {d.semester}</TableCell>
                  <TableCell className="py-2.5 text-sm font-semibold text-teal-700 dark:text-teal-300">{d.subject}</TableCell>
                  <TableCell className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 h-8 w-8 p-0"
                        title="Preview"
                        onClick={() => setPreviewItem({ url: d.fileUrl, title: `${d.subject} — ${d.course} Year ${d.year} Sem ${d.semester}` })}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-teal-600 border-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/20" 
                        onClick={() => handleDownload(d.fileUrl, `${d.subject}_${d.course}_Year${d.year}_Sem${d.semester}.pdf`.replace(/\s+/g, "_"), d._id)}
                        disabled={downloadingId === d._id}
                      >
                        {downloadingId === d._id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin sm:mr-1" />
                        ) : (
                          <Download className="h-3.5 w-3.5 sm:mr-1" />
                        )}
                        <span className="hidden sm:inline">
                          {downloadingId === d._id ? "Wait..." : "Download"}
                        </span>
                      </Button>
                    </div>
                  </TableCell>

                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Syllabus */}
      {activeSubTab === "SYLLABUS" && (
        syllabusLoading ? <LoadingState /> :
        !syllabuses.length ? <EmptyState icon={FileText} color="text-indigo-500" label="Syllabuses" /> :
        <div className="rounded-md border overflow-hidden overflow-x-auto">
          <Table className="min-w-[400px]">

            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="py-3 text-xs font-bold uppercase w-[50px]">No</TableHead>
                <TableHead className="py-3 text-xs font-bold uppercase">Course</TableHead>
                <TableHead className="py-3 text-xs font-bold uppercase">Year</TableHead>
                <TableHead className="py-3 text-xs font-bold uppercase">File Name</TableHead>
                <TableHead className="py-3 text-xs font-bold uppercase text-right">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {syllabuses.map((s, idx) => (
                <TableRow key={s._id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="py-2.5 text-sm text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="py-2.5 text-sm">{s.course}</TableCell>
                  <TableCell className="py-2.5 text-sm">{s.year}</TableCell>
                  <TableCell className="py-2.5 text-sm font-semibold text-indigo-700 dark:text-indigo-300">{s.fileName || "Syllabus"}</TableCell>
                  <TableCell className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 h-8 w-8 p-0"
                        title="Preview"
                        onClick={() => setPreviewItem({ url: s.fileUrl, title: `${s.fileName || 'Syllabus'} — ${s.course} Year ${s.year}` })}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-indigo-600 border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20" 
                        onClick={() => handleDownload(s.fileUrl, `${s.course}_Year${s.year}_Syllabus.pdf`.replace(/\s+/g, "_"), s._id)}
                        disabled={downloadingId === s._id}
                      >
                        {downloadingId === s._id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin sm:mr-1" />
                        ) : (
                          <Download className="h-3.5 w-3.5 sm:mr-1" />
                        )}
                        <span className="hidden sm:inline">
                          {downloadingId === s._id ? "Wait..." : "Download"}
                        </span>
                      </Button>
                    </div>
                  </TableCell>

                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Books */}
      {activeSubTab === "BOOKS" && (
        booksLoading ? <LoadingState /> :
        !books.length ? <EmptyState icon={BookOpen} color="text-amber-500" label="Books" /> :
        <div className="rounded-md border overflow-hidden overflow-x-auto">
          <Table className="min-w-[380px]">

            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="py-3 text-xs font-bold uppercase w-[50px]">No</TableHead>
                <TableHead className="py-3 text-xs font-bold uppercase">Book Name</TableHead>
                <TableHead className="py-3 text-xs font-bold uppercase">Course</TableHead>
                <TableHead className="py-3 text-xs font-bold uppercase text-right">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {books.map((b, idx) => (
                <TableRow key={b._id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="py-2.5 text-sm text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="py-2.5 text-sm font-semibold text-amber-700 dark:text-amber-300">{b.name}</TableCell>
                  <TableCell className="py-2.5 text-sm">{b.course || "—"}</TableCell>
                  <TableCell className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 h-8 w-8 p-0"
                        title="Preview"
                        onClick={() => setPreviewItem({ url: b.fileUrl, title: b.name })}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20" 
                        onClick={() => handleDownload(b.fileUrl, `${b.name}.pdf`.replace(/\s+/g, "_"), b._id)}
                        disabled={downloadingId === b._id}
                      >
                        {downloadingId === b._id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin sm:mr-1" />
                        ) : (
                          <Download className="h-3.5 w-3.5 sm:mr-1" />
                        )}
                        <span className="hidden sm:inline">
                          {downloadingId === b._id ? "Wait..." : "Download"}
                        </span>
                      </Button>
                    </div>
                  </TableCell>

                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function AwardPoster({ award, currentUser, festSettings }) {
  const Icon = award.icon;
  const posterRef = React.useRef(null);
  const [isExporting, setIsExporting] = React.useState(false);

  const orgLogo = festSettings?.org?.logo?.url;
  const instLogo = festSettings?.institution?.logo?.url;

  const colorMap = {
    amber: "from-amber-400 via-yellow-500 to-amber-600",
    emerald: "from-emerald-400 via-teal-500 to-emerald-600",
    yellow: "from-yellow-400 via-amber-500 to-yellow-600",
    gold: "from-yellow-300 via-amber-400 to-yellow-600",
    silver: "from-slate-300 via-slate-400 to-slate-500",
    bronze: "from-amber-600 via-orange-700 to-amber-800",
    indigo: "from-indigo-400 via-blue-500 to-indigo-600",
    rose: "from-rose-400 via-pink-500 to-rose-600",
  };
  
  const bgGradient = colorMap[award.color] || "from-zinc-400 to-zinc-600";

  const downloadAsJpeg = async () => {
    if (!posterRef.current) return;
    setIsExporting(true);
    try {
      // Small delay to ensure any hover states are cleared if needed
      await new Promise(r => setTimeout(r, 100));
      
      const canvas = await html2canvas(posterRef.current, {
        scale: 3, // High quality
        useCORS: true,
        backgroundColor: null,
        logging: false,
      });
      
      const image = canvas.toDataURL("image/jpeg", 0.9);
      const link = document.createElement("a");
      link.href = image;
      link.download = `${award.type}_${award.period.replace(/\s+/g, "_")}.jpg`;
      link.click();
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div 
        ref={posterRef}
        className="group relative flex flex-col items-center p-8 rounded-[2.5rem] border shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 w-full max-w-sm"
      >
        {/* Background Decorative Elements */}
        <div className={`absolute top-0 left-0 w-full h-32 bg-gradient-to-b ${bgGradient} opacity-10`} />
        
        {/* Logos for Best Reader */}
        {award.type === "BEST READER" && (
            <>
                {orgLogo && (
                    <div className="absolute top-6 left-6 w-10 h-10 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                        <img src={orgLogo} alt="Org" className="w-full h-full object-contain" />
                    </div>
                )}
                {instLogo && (
                    <div className="absolute top-6 right-6 w-10 h-10 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                        <img src={instLogo} alt="Inst" className="w-full h-full object-contain" />
                    </div>
                )}
            </>
        )}

        {/* Trophy/Icon at top right - Hidden if logos are present to avoid overlap */}
        {award.type !== "BEST READER" && Icon && (
            <Icon className="absolute top-6 right-6 h-10 w-10 text-zinc-200 dark:text-zinc-800 opacity-50 group-hover:opacity-100 transition-opacity" />
        )}
        
        {/* Profile Pic with rank border */}
        <div className="relative mb-8 z-10">
            <div className={`w-36 h-36 rounded-full p-1.5 bg-gradient-to-br ${bgGradient} shadow-xl`}>
                <div className="w-full h-full rounded-full border-[6px] border-white dark:border-zinc-900 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                    {currentUser?.profilePic?.url ? (
                        <img src={currentUser.profilePic.url} alt={currentUser.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-zinc-400">
                            {currentUser?.name?.charAt(0) || "S"}
                        </div>
                    )}
                </div>
            </div>
            {/* Badge */}
            <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-6 py-1.5 rounded-full text-xs font-black tracking-[0.2em] text-white shadow-xl uppercase bg-gradient-to-r ${bgGradient} border-2 border-white dark:border-zinc-900`}>
              {award.rankLabel || "Winner"}
            </div>
        </div>

        <div className="text-center space-y-3 pb-4">
            {award.type && !["ATTENDANCE TOPPER", "BEST READER"].includes(award.type) && (
                <h4 className={`text-[10px] font-black tracking-[0.3em] uppercase opacity-70 ${
                  award.color === 'amber' ? 'text-amber-600' :
                  award.color === 'emerald' ? 'text-emerald-600' :
                  award.color === 'gold' ? 'text-yellow-600' :
                  award.color === 'silver' ? 'text-slate-500' :
                  award.color === 'bronze' ? 'text-amber-700' :
                  award.color === 'indigo' ? 'text-indigo-600' :
                  'text-yellow-600'
                }`}>
                    {award.type}
                </h4>
            )}
            <h3 className="text-3xl font-black tracking-tight leading-tight text-zinc-900 dark:text-white whitespace-pre-line">
                {award.title?.includes("of the Month") ? (
                  <>
                    {award.title.replace("of the Month", "").trim()}
                    <span className="block text-xl opacity-80 mt-1">of the Month</span>
                  </>
                ) : (award.title || "Achievement")}
            </h3>
            {award.subtitle && (
                <p className="text-base font-bold text-zinc-500 dark:text-zinc-400">{award.subtitle}</p>
            )}
            {award.extraInfo && (
                <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">{award.extraInfo}</p>
            )}
            <div className="pt-6 flex flex-col items-center">
                <div className={`px-6 py-2 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-sm font-black tracking-widest uppercase ${
                  award.color === 'amber' ? 'text-amber-700' :
                  award.color === 'emerald' ? 'text-emerald-700' :
                  award.color === 'gold' ? 'text-yellow-700' :
                  award.color === 'silver' ? 'text-slate-600' :
                  award.color === 'bronze' ? 'text-amber-800' :
                  award.color === 'indigo' ? 'text-indigo-700' :
                  'text-yellow-700'
                }`}>
                    {award.period}
                </div>
            </div>
        </div>
        
        {/* Shimmer effect */}
        <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
        
        <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 w-full flex justify-center opacity-40">
           <span className="text-[10px] font-black tracking-[0.4em] uppercase text-zinc-400">Congratulations...</span>
        </div>
      </div>
      
      <Button 
        variant="outline" 
        size="sm" 
        onClick={downloadAsJpeg} 
        disabled={isExporting}
        className="rounded-full gap-2 text-xs font-bold tracking-widest uppercase hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        {isExporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
        Download JPEG
      </Button>
    </div>
  );
}

function AwardsTabContent({ currentUser, apiKey }) {
  const [awards, setAwards] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [festSettings, setFestSettings] = React.useState(null);

  React.useEffect(() => {
    const fetchAwards = async () => {
      setLoading(true);
      const studentAwards = [];
      
      try {
        // Fetch Settings first for branding
        let currentFestSettings = null;
        try {
            const settingsRes = await fetch("/api/settings", { cache: "no-store", headers: { "api-key": apiKey } });
            const settingsData = await settingsRes.json();
            if (settingsData.success || settingsData.settings) {
                currentFestSettings = settingsData.settings;
            }
        } catch (err) {
            console.error("Settings fetch error:", err);
        }

        const monthsToCheck = 36; // Check last 3 years
        
        // 1. Fetch Best Reader awards
        const bestReaderPromises = [];
        for (let m = 1; m <= monthsToCheck; m++) { // Start from 1 to skip current uncompleted month
            const date = new Date();
            date.setMonth(date.getMonth() - m);
            const month = date.getMonth();
            const year = date.getFullYear();
            const capturedDate = new Date(date);
            bestReaderPromises.push(
                fetch(`/api/library/stats/best-reader?month=${month}&year=${year}`, { cache: "no-store", headers: { "api-key": apiKey } })
                    .then(r => r.json())
                    .then(res => {
                        const bestReaderId = res.data?.student?._id;
                        if (res.success && bestReaderId && String(bestReaderId) === String(currentUser._id)) {
                            studentAwards.push({
                                type: "BEST READER",
                                title: "Best Reader of the Month",
                                subtitle: "Library Achievement",
                                extraInfo: `${res.data.count} books borrowed`,
                                period: formatMonthYear(capturedDate),
                                date: new Date(capturedDate.getFullYear(), capturedDate.getMonth(), 1),
                                icon: BookOpen,
                                color: "amber",
                                rankLabel: "Best Reader"
                            });
                        }
                    })
                    .catch(() => null)
            );
        }

        // 2. Fetch Attendance Topper awards (one per completed month, per class)
        const attendancePromises = [];
        for (let m = 1; m <= monthsToCheck; m++) { // Start from 1 to skip current uncompleted month
            const date = new Date();
            date.setMonth(date.getMonth() - m);
            const firstDayDate = new Date(date.getFullYear(), date.getMonth(), 1);
            const lastDayDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            
            const firstDay = formatDate(firstDayDate);
            const lastDay = formatDate(lastDayDate);
            const capturedDate = new Date(date);
            
            attendancePromises.push(
                fetch(`/api/attendanceToppers?startDate=${firstDay}&endDate=${lastDay}&limit=100`, { cache: "no-store", headers: { "api-key": apiKey } })
                    .then(r => r.json())
                    .then(res => {
                        if (res.success && res.attendanceToppers?.length > 0) {
                            // res.attendanceToppers is an array: [{ classId, className, students: [{studentId, attendancePercentage, ...}] }, ...]
                            res.attendanceToppers.forEach(classResult => {
                                const topperEntry = classResult.students.find(s => String(s.studentId) === String(currentUser._id));
                                if (topperEntry) {
                                    studentAwards.push({
                                        type: "ATTENDANCE TOPPER",
                                        title: "Attendance Topper",
                                        subtitle: classResult.className || "Class Topper",
                                        extraInfo: topperEntry.attendancePercentage != null ? `${topperEntry.attendancePercentage}% Attendance` : undefined,
                                        period: formatMonthYear(capturedDate),
                                        date: new Date(capturedDate.getFullYear(), capturedDate.getMonth(), 1),
                                        icon: Calendar,
                                        color: "emerald",
                                        rankLabel: "Topper"
                                    });
                                }
                            });
                        }
                    })
                    .catch(() => null)
            );
        }

        // 3. Fetch Students Fest Awards (1st, 2nd, 3rd Place) from Winner Posters
        const winnersPromise = fetch(`/api/winner-posters`, { cache: "no-store", headers: { "api-key": apiKey } })
            .then(r => r.json())
            .then(res => {
                if (res.success && res.programs) {
                    res.programs.forEach(prog => {
                        prog.winners.forEach(w => {
                            // Robust matching: check by _id (participant ID == user ID) or by name
                            const winnerId = String(w._id || "").split("-")[0];
                            const isMatch =
                                winnerId === String(currentUser._id) ||
                                String(w._id) === String(currentUser._id) ||
                                (w.name && currentUser.name &&
                                 w.name.trim().toUpperCase() === currentUser.name.trim().toUpperCase());

                            if (isMatch) {
                                let awardInfo = null;
                                if (w.rank === 1) {
                                    awardInfo = {
                                        type: "STUDENTS FEST",
                                        title: "1st Place 🥇",
                                        color: "gold",
                                        icon: Trophy,
                                        rankLabel: "1st Place"
                                    };
                                } else if (w.rank === 2) {
                                    awardInfo = {
                                        type: "STUDENTS FEST",
                                        title: "2nd Place 🥈",
                                        color: "silver",
                                        icon: Award,
                                        rankLabel: "2nd Place"
                                    };
                                } else if (w.rank === 3) {
                                    awardInfo = {
                                        type: "STUDENTS FEST",
                                        title: "3rd Place 🥉",
                                        color: "bronze",
                                        icon: Award,
                                        rankLabel: "3rd Place"
                                    };
                                }

                                if (awardInfo) {
                                    const festName = currentFestSettings?.festival?.festivalInfo?.name || "STUDENTS FEST";
                                    const festYear = currentFestSettings?.festival?.festivalInfo?.year || "";
                                    
                                    studentAwards.push({
                                        ...awardInfo,
                                        type: `${festName} ${festYear}`.trim().toUpperCase(),
                                        subtitle: prog.name,
                                        extraInfo: `Team: ${w.teamName} | Grade: ${w.grade || 'N/A'} | Points: ${w.points || 0}`,
                                        period: prog.division || "Competition Result",
                                        date: new Date(),
                                    });
                                }
                            }
                        });
                    });
                }
            })
            .catch(() => null);

        // 4. Fetch Division Toppers (Individual Toppers)
        const individualToppersPromise = fetch(`/api/individual-toppers`, { cache: "no-store", headers: { "api-key": apiKey } })
            .then(r => r.json())
            .then(res => {
                if (res.success && res.data) {
                    res.data.forEach(topper => {
                        // Match by ID primarily (updated in API), then fallback to name
                        if (topper._id === currentUser._id || topper.name === currentUser.name) {
                             studentAwards.push({
                                type: "TOPPER",
                                title: "Overall Division Topper",
                                subtitle: `${topper.divisionName} Category`,
                                period: `Accrued ${topper.points} Points`,
                                date: new Date(),
                                icon: Award,
                                color: "indigo"
                            });
                        }
                    });
                }
            })
            .catch(() => null);

        // 5. Fetch Academic Toppers (Marks Toppers)
        const marksToppersPromise = fetch(`/api/marks/toppers`, { cache: "no-store", headers: { "api-key": apiKey } })
            .then(r => r.json())
            .then(res => {
                if (res.success && res.data) {
                    res.data.forEach(examGroup => {
                        const topperEntry = examGroup.toppers.find(t => String(t.studentId) === String(currentUser._id));
                        if (topperEntry) {
                            studentAwards.push({
                                type: "MARKS TOPPER",
                                title: "Academic Excellence",
                                subtitle: `${examGroup.examName}`,
                                extraInfo: `Score: ${topperEntry.total} (${topperEntry.percentage}%)`,
                                period: examGroup.className,
                                date: new Date(),
                                icon: Trophy,
                                color: "indigo",
                                rankLabel: "Topper"
                            });
                        }
                    });
                }
            })
            .catch(() => null);

        await Promise.all([
            ...bestReaderPromises, 
            ...attendancePromises, 
            winnersPromise, 
            individualToppersPromise,
            marksToppersPromise
        ]);
        
        // Sort awards by date descending
        studentAwards.sort((a, b) => b.date - a.date);
        setAwards(studentAwards);
        setFestSettings(currentFestSettings);
      } catch (e) {
        console.error("Awards fetch error:", e);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser?._id && apiKey) fetchAwards();
  }, [currentUser?._id, apiKey]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-500 mb-4" />
        <p className="text-sm text-muted-foreground animate-pulse font-medium">Analyzing your achievements...</p>
    </div>
  );

  if (!awards.length) return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <div className="p-6 rounded-3xl bg-yellow-50 dark:bg-yellow-900/10 mb-6 transform transition-transform hover:scale-110 duration-500">
        <Trophy className="h-16 w-16 text-yellow-500/40" />
      </div>
      <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-200 mb-2">No Awards Yet</h3>
      <p className="text-sm max-w-xs text-center opacity-70">Keep up the great work! Your achievements will shine here once you top the charts.</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-4">
      {awards.map((award, idx) => (
        <AwardPoster key={idx} award={award} currentUser={currentUser} festSettings={festSettings} />
      ))}
    </div>
  );
}

export default function StudentDashboard({
  user,
  apiKey,
  classes,
  batches,
  attendanceData: initialData,
  updates = [],
  hideHeader = false,
  showKinship = false,
  debtBalances = [],
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [currentUser, setCurrentUser] = useState(user);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const detailsRef = useRef(null);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    // Add a slight delay to ensure the content is rendered before scrolling
    setTimeout(() => {
      detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  const { useFetchItems } = useCrud("studentAttendances", apiKey);
  const { data: fetchedData, isLoading, error } = useFetchItems(
    0,
    0,
    {
      studentId: currentUser?._id,
    },
    { enabled: !initialData }
  );

  const attendanceData = initialData || fetchedData;
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [pendingFunds, setPendingFunds] = useState([]); // Array of fund objects
  const [fundsLoading, setFundsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("PROFILE");
  const [articles, setArticles] = useState([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [articlesLoaded, setArticlesLoaded] = useState(false);
  const [rentalHistory, setRentalHistory] = useState([]);
  const [rentalsLoading, setRentalsLoading] = useState(true);
  const [marks, setMarks] = useState([]);
  const [marksLoading, setMarksLoading] = useState(true);
  const [remarksList, setRemarksList] = useState([]);
  const [remarksLoading, setRemarksLoading] = useState(true);
  const [selectedExamId, setSelectedExamId] = useState("all");
  const [couponDetails, setCouponDetails] = useState([]);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [selectedStandardFund, setSelectedStandardFund] = useState(null);
  const [isStandardModalOpen, setIsStandardModalOpen] = useState(false);
  const [leavesList, setLeavesList] = useState([]);
  const [leavesLoading, setLeavesLoading] = useState(true);
  const isActiveStudent = currentUser?.studentSpecificField?.status === "Active";
  const [librarySubTab, setLibrarySubTab] = useState(isActiveStudent ? "BOOKS" : "HISTORY");
  const [libraryBooks, setLibraryBooks] = useState([]);
  const [libraryBooksLoading, setLibraryBooksLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState([]);


  const className = classes.find(
    (c) => c._id === currentUser?.studentSpecificField?.classId
  )?.name;

  const admissionClassName = classes.find(
    (c) => c._id === currentUser?.studentSpecificField?.admissionClassId
  )?.name;

  const batchName = batches.find(
    (b) => b._id === currentUser?.studentSpecificField?.batchId
  )?.name;

  useEffect(() => {
    const fetchFunds = async () => {
      setFundsLoading(true);
      const fundsList = [];

      try {
        // 1. Fetch All Student Funds (Department + Individual)
        // Removed batchId to fetch all history for aggregation
        const allFundsPromise = fetch(`/api/studentsFund?studentId=${currentUser._id}&getAll=true`, {
          headers: { "Content-Type": "application/json", "api-key": apiKey }
        }).then(res => res.ok ? res.json() : { studentFunds: [] });

        // 2. Fetch Coupon Fund (Search by Student ID)
        const couponPromise = fetch(`/api/student-coupons?search=${currentUser._id}`, {
          headers: { "Content-Type": "application/json", "api-key": apiKey }
        }).then(res => res.ok ? res.json() : { stats: { totalPending: 0 } });

        const [fundsResult, couponResult] = await Promise.all([
          allFundsPromise,
          couponPromise
        ]);

        // Process Standard Funds with Aggregation
        const fundsMap = new Map();

        (fundsResult.studentFunds || []).forEach(fund => {
          // Filter to only include funds for the student's current batch
          if (fund.batchId !== currentUser?.studentSpecificField?.batchId) return;

          let label = "Students Fund";
          let subLabel = "";
          
          if (fund.fundType === 'Department') {
            label = `${fund.department} Fund`;
            // For Department funds, the "Role Holder" is the one who added/performed the transaction
            const lastTransaction = fund.transactions?.[fund.transactions.length - 1];
            subLabel = lastTransaction?.performedBy?.name || fund.department;
          } else {
            const roles = fund.teacherId?.roles || [];
            subLabel = fund.teacherId?.name || "Class Teacher";
            
            if (roles.includes("Teacher")) {
              label = "Students Fund";
            } else if (roles.length > 0) {
              label = "Staff Fund";
            }
          }

          const key = `Fund-${label}-${subLabel}`;
          const currentBatch = batches.find(b => b._id === fund.batchId)?.name || "Unknown Batch";
          
          if (fundsMap.has(key)) {
            const entry = fundsMap.get(key);
            entry.value += fund.balance; // Use balance as-is (database stores debt as negative)
            entry.records.push({
              year: currentBatch,
              holder: subLabel,
              value: fund.balance
            });
            // Support history: aggregate all transactions from these records
            entry.allTransactions = [...(entry.allTransactions || []), ...(fund.transactions || [])];
          } else {
            fundsMap.set(key, {
              label: label,
              subLabel: fund.fundType === 'Department' ? "" : subLabel,
              value: fund.balance, // Use balance as-is (database stores debt as negative)
              isInteractive: true,
              records: [{
                year: currentBatch,
                holder: subLabel,
                value: fund.balance
              }],
              allTransactions: fund.transactions || []
            });
          }
        });

        // Convert map values to list and calculate running balances
        fundsMap.forEach(item => {
          if (item.allTransactions && item.allTransactions.length > 0) {
            // Sort oldest first for balance calculation
            const sorted = [...item.allTransactions].sort((a, b) => new Date(a.date) - new Date(b.date));
            let running = 0;
            sorted.forEach(t => {
              if (t.type === 'Withdrawal') {
                running -= t.amount;
              } else {
                running += t.amount;
              }
              t.calculatedBalance = running;
            });
            // Keep the sorted for display (though UI will sort descending)
            item.allTransactions = sorted;
          }
          fundsList.push(item);
        });

        // Process Coupon Fund
        const rawCoupons = couponResult.coupons || [];
        setCouponDetails(rawCoupons);
        
        const couponPendingTotal = (couponResult.stats?.totalPending || 0);
        
        if (couponPendingTotal > 0) {
          fundsList.push({
            label: "Coupon Fund",
            value: -couponPendingTotal, // Negate to show as debt
            isCoupon: true
          });
        }

        setPendingFunds(fundsList);
      } catch (error) {
        console.error("Error fetching pending funds:", error);
        setPendingFunds([]);
      } finally {
        setFundsLoading(false);
      }
    };

    if (currentUser?._id && currentUser?.studentSpecificField?.batchId && apiKey) {
      fetchFunds();
    } else {
      setFundsLoading(false);
    }
  }, [currentUser, classes, apiKey]);

  useEffect(() => {
    const fetchRentals = async () => {
      if (!currentUser?._id || !apiKey) return;
      setRentalsLoading(true);
      try {
        const res = await fetch(`/api/rental?studentId=${currentUser._id}`, {
          headers: { "Content-Type": "application/json", "api-key": apiKey }
        });
        const result = await res.json();
        if (result.success) {
          setRentalHistory(result.data || []);
        }
      } catch (error) {
        console.error("Error fetching rental history:", error);
      } finally {
        setRentalsLoading(false);
      }
    };
    fetchRentals();
  }, [currentUser, apiKey]);

  useEffect(() => {
    const fetchMarks = async () => {
      if (!currentUser?._id || !apiKey) return;
      setMarksLoading(true);
      try {
        const res = await fetch(`/api/marks?studentId=${currentUser._id}`, {
          cache: "no-store",
          headers: { "Content-Type": "application/json", "api-key": apiKey }
        });
        const result = await res.json();
        if (result.success) {
          setMarks(result.data || []);
        }
      } catch (error) {
        console.error("Error fetching marks:", error);
      } finally {
        setMarksLoading(false);
      }
    };
    fetchMarks();
  }, [currentUser, apiKey]);

  useEffect(() => {
    const fetchRemarks = async () => {
      if (!currentUser?._id || !apiKey) return;
      setRemarksLoading(true);
      try {
        const res = await fetch(`/api/remarks?studentId=${currentUser._id}`, {
          cache: "no-store",
          headers: { "Content-Type": "application/json", "api-key": apiKey }
        });
        const result = await res.json();
        if (result.remarks) {
          setRemarksList(result.remarks || []);
        }
      } catch (error) {
        console.error("Error fetching remarks:", error);
      } finally {
        setRemarksLoading(false);
      }
    };
    fetchRemarks();
  }, [currentUser, apiKey]);

  useEffect(() => {
    const fetchLeaves = async () => {
      if (!currentUser?._id || !apiKey) return;
      setLeavesLoading(true);
      try {
        const res = await fetch(`/api/leave-records?studentId=${currentUser._id}&limit=1000`, {
          headers: { "Content-Type": "application/json", "api-key": apiKey }
        });
        const result = await res.json();
        if (result["leave-records"]) {
          setLeavesList(result["leave-records"] || []);
        }
      } catch (error) {
        console.error("Error fetching leave records:", error);
      } finally {
        setLeavesLoading(false);
      }
    };
    fetchLeaves();
  }, [currentUser, apiKey]);

  useEffect(() => {
    const fetchLibraryBooks = async (showLoading = true) => {
      if (!apiKey || !isActiveStudent) return;
      if (showLoading) setLibraryBooksLoading(true);
      try {
        const res = await fetch("/api/library/books", {
          headers: { "Content-Type": "application/json", "api-key": apiKey }
        });
        const result = await res.json();
        if (result.success) {
          setLibraryBooks(result.data || []);
        }
      } catch (error) {
        console.error("Error fetching library books:", error);
      } finally {
        if (showLoading) setLibraryBooksLoading(false);
      }
    };
    fetchLibraryBooks(true);
    const interval = setInterval(() => fetchLibraryBooks(false), 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [apiKey, isActiveStudent]);

  useEffect(() => {
    if (!isActiveStudent && librarySubTab === "BOOKS") {
      setLibrarySubTab("HISTORY");
    }
  }, [isActiveStudent, librarySubTab]);

  const fetchPendingRequests = async () => {
    if (!apiKey || !currentUser._id) return;
    try {
      const res = await fetch(`/api/library/requests?studentId=${currentUser._id}&status=Pending`, {
        headers: { "Content-Type": "application/json", "api-key": apiKey }
      });
      const result = await res.json();
      if (result.success) {
        setPendingRequests(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching pending requests:", error);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
    const interval = setInterval(fetchPendingRequests, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [apiKey, currentUser._id]);

  // Lazy-load articles only when ARTICLES tab is first opened
  useEffect(() => {
    if (activeTab !== "ARTICLES" || articlesLoaded || !apiKey) return;
    setArticlesLoading(true);
    fetch("/api/articles", { headers: { "api-key": apiKey } })
      .then(r => r.json())
      .then(d => { setArticles(d.articles || []); setArticlesLoaded(true); })
      .catch(e => console.error("Articles fetch error:", e))
      .finally(() => setArticlesLoading(false));
  }, [activeTab, articlesLoaded, apiKey]);

  const handleRequestBook = async (book) => {
    if (book.status !== "Available") {
      toast.error("This book is not available for request");
      return;
    }
    if (!confirm(`Are you sure you want to request "${book.name}"?`)) return;

    try {
      const res = await fetch("/api/library/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": apiKey },
        body: JSON.stringify({ bookId: book._id, studentId: currentUser._id })
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Request submitted successfully");
        fetchPendingRequests();
      } else {
        toast.error(result.msg || "Failed to submit request");
      }
    } catch (error) {
      console.error("Error requesting book:", error);
      toast.error("An error occurred while requesting the book");
    }
  };

  const attendanceHistory = useMemo(() => {
    // Robust extraction of attendance records
    let records = [];
    if (attendanceData) {
      // The API often returns { studentAttendances: [...] } or just [...]
      const dataToProcess = attendanceData.studentAttendances || attendanceData;

      if (Array.isArray(dataToProcess)) {
        // Handle array of student attendance documents
        records = dataToProcess.flatMap(d => d.attendanceRecords || []);
      } else if (dataToProcess.attendanceRecords) {
        // Handle single student attendance document
        records = dataToProcess.attendanceRecords;
      } else if (Array.isArray(dataToProcess.records)) {
        // Handle direct records array
        records = dataToProcess.records;
      }
    }

    // FIXED: Calculate across ALL available years in attendance records, not just selectedYear
    const allYearsInRecords = new Set();
    records.forEach(r => allYearsInRecords.add(new Date(r.date).getFullYear()));

    // Sort years and handle empty case
    const sortedYears = Array.from(allYearsInRecords).sort((a, b) => a - b);
    if (sortedYears.length === 0) sortedYears.push(new Date().getFullYear());

    const history = [];

    // Create entries for each year's months that have data
    sortedYears.forEach(year => {
      for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
        const recordsForMonth = records.filter((r) => {
          const d = new Date(r.date);
          return d.getFullYear() === year && d.getMonth() === monthIndex;
        });

        if (recordsForMonth.length > 0) {
          const monthName = new Date(year, monthIndex, 1).toLocaleString("en-US", { month: "long" });
          const totalPeriods = recordsForMonth.length;
          const presentPeriods = recordsForMonth.filter((r) => r.present).length;

          const details = recordsForMonth.map((r, rIdx) => ({
            id: r._id || `${r.date}-${rIdx}-${r.periodNumber}`,
            date: formatDateForDisplay(r.date),
            present: r.present,
            subject: r.subjectName || "N/A",
            teacher: r.teacherName || "N/A",
          }));

          history.push({
            year,
            month: monthName,
            monthYear: `${monthName} ${year}`,
            totalPeriods,
            presentPeriods,
            details,
            percentage: ((presentPeriods / totalPeriods) * 100).toFixed(2),
          });
        }
      }
    });

    return history;
  }, [attendanceData]);

  const academicYears = useMemo(() => {
    const yearsFromRecords = new Set();
    attendanceHistory.forEach(h => yearsFromRecords.add(h.year));

    let yearsFromBatch = [];
    if (batchName) {
      const match = batchName.match(/\d{4}/g);
      if (match) {
        const startYear = parseInt(match[0], 10);
        const endYear = match[1] ? parseInt(match[1], 10) : startYear + 1;
        for (let year = startYear; year <= endYear; year++) {
          yearsFromBatch.push(year);
        }
      }
    }

    const allYears = new Set([...yearsFromRecords, ...yearsFromBatch]);
    if (allYears.size === 0) allYears.add(new Date().getFullYear());

    return Array.from(allYears).sort((a, b) => b - a); // Sort descending (newest first)
  }, [batchName, attendanceHistory]);

  useEffect(() => {
    if (academicYears.length > 0 && !academicYears.includes(selectedYear)) {
      setSelectedYear(academicYears[0]);
    }
  }, [academicYears, selectedYear]);

  // For the chart and history card, filter by selectedYear if needed
  const filteredAttendanceHistory = useMemo(() => {
    return attendanceHistory.filter(h => h.year === selectedYear);
  }, [attendanceHistory, selectedYear]);

  const currentDate = formatDateForDisplay(new Date());

  const getStatusClass = (status) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case "Dropped Out":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
      case "Graduated":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
    }
  };

  const displayFunds = useMemo(() => {
    const list = [...(pendingFunds || [])];
    (debtBalances || []).forEach(d => {
      list.push({
        label: d.category,
        subLabel: d.year,
        value: -d.balance, // Show as negative for debt
        isDebt: true
      });
    });
    return list.filter(item => item.value !== 0);
  }, [pendingFunds, debtBalances]);

  const totalPending = useMemo(() => {
    return displayFunds.reduce((acc, item) => acc + (item.value || 0), 0);
  }, [displayFunds]);


  return (
    <>
      <style>{`
        @media print {
          /* Force exact colors and backgrounds */
          * { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
            box-shadow: none !important;
          }
          
          /* Reset root and body layout */
          @page { margin: 1cm !important; size: auto; }
          html, body { 
            height: auto !important; 
            overflow: visible !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            background: white !important;
            width: 100% !important;
          }

          /* Nuke all potentially hidden spacing at the top */
          .no-print, [class*="no-print"] { 
            display: none !important; 
            height: 0 !important; 
            width: 0 !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            position: absolute !important;
            pointer-events: none !important;
          }

          /* Force all containers to be visible and expanded */
          [class*="overflow-"], 
          [class*="max-h-"],
          [class*="min-h-"] {
            overflow: visible !important;
            max-height: none !important;
            min-height: 0 !important;
            height: auto !important;
          }

          /* Specific resets for layout wrappers */
          .SidebarProvider, 
          [class*="sidebar-wrapper"], 
          [class*="h-screen"],
          [class*="min-h-svh"],
          main, 
          header,
          section { 
            display: block !important; 
            height: auto !important; 
            min-height: 0 !important; 
            overflow: visible !important;
            position: static !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Disable all animations and transitions in print */
          *, *::before, *::after {
            animation-delay: 0s !important;
            animation-duration: 0s !important;
            animation-iteration-count: 1 !important;
            transition-delay: 0s !important;
            transition-duration: 0s !important;
          }

          /* Reset space-y and margins on the main container children */
          .space-y-6, .space-y-4 { gap: 0 !important; }
          .space-y-6 > *, .mt-6, .pt-5, .p-4, .p-8 { 
            margin-top: 0 !important; 
            padding-top: 0 !important; 
          }
          
          /* Prevent cards from breaking across pages */
          .card-print-break { 
            break-inside: avoid !important; 
            page-break-inside: avoid !important; 
            margin-bottom: 2rem !important; 
            display: block !important;
            border: 1px solid #e2e8f0 !important;
          }

          /* Professional Table Styling for Print */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-bottom: 1rem !important;
            table-layout: auto !important;
          }
          th, td {
            border: 1px solid #e2e8f0 !important;
            padding: 8px 12px !important;
            text-align: left !important;
            font-size: 11px !important;
            line-height: 1.4 !important;
          }
          th {
            background-color: #f8fafc !important;
            font-weight: bold !important;
            text-transform: uppercase !important;
            color: #1e293b !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
          
          /* Specific column tweaks */
          .w-[60px] { width: 50px !important; }
          .text-center { text-align: center !important; }
          .text-right { text-align: right !important; }

          /* Layout specific for reports */
          .print-grid-2 { 
            display: grid !important; 
            grid-template-columns: 1fr 1fr !important; 
            gap: 1.5rem !important; 
          }
          .print-stack-vertical { 
            display: block !important; 
            width: 100% !important;
          }
          .print-stack-vertical > * {
            width: 100% !important;
            margin-bottom: 2rem !important;
          }
          
          .print-flex-row { 
            display: flex !important; 
            flex-direction: row !important; 
            align-items: center !important; 
            gap: 2rem !important; 
          }
          .print-exam-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-bottom: 1.5rem !important;
            display: block !important;
          }
        }
      `}</style>

      <div className="space-y-6 max-w-7xl mx-auto">
        <PrintHeader title="STUDENT PROFILE" apiKey={apiKey} displayOnScreen={false} />

      {/* Premium Header */}
      <div className="no-print relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-950 p-8 text-white shadow-xl mb-6">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left w-full md:w-auto">
            {/* Mobile Header: Photo and Card side by side */}
            <div className="flex flex-row items-center justify-between w-full md:w-auto gap-4">
              <Avatar className="h-24 w-24 rounded-2xl border-4 border-white/20 shadow-2xl ring-4 ring-blue-500/20">
                <AvatarImage src={currentUser?.profilePic?.url} alt={currentUser?.name} className="object-cover" />
                <AvatarFallback className="bg-white/10 text-2xl font-bold backdrop-blur-md">
                  {currentUser?.name?.[0]}
                </AvatarFallback>
              </Avatar>
              
              {/* Status Badge for Mobile View */}
              <div className="md:hidden flex flex-col items-end gap-2">
                {currentUser?.studentSpecificField?.status && (
                  <div className={cn(
                    "px-3 py-1.5 rounded-xl border font-bold text-[10px] uppercase tracking-wider backdrop-blur-md shadow-lg flex items-center gap-1.5",
                    currentUser.studentSpecificField.status === "Active" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                    currentUser.studentSpecificField.status === "Dropped Out" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                    currentUser.studentSpecificField.status === "Graduated" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                    "bg-slate-500/20 text-slate-400 border-slate-500/30"
                  )}>
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      currentUser.studentSpecificField.status === "Active" ? "bg-green-400 animate-pulse" :
                      currentUser.studentSpecificField.status === "Dropped Out" ? "bg-red-400" :
                      currentUser.studentSpecificField.status === "Graduated" ? "bg-blue-400" :
                      "bg-slate-400"
                    )} />
                    {currentUser.studentSpecificField.status}
                  </div>
                )}
                {!hideHeader && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2 bg-white/10 hover:bg-white/20 border-white/20 text-white gap-2 h-8 px-4 text-xs font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
                    onClick={() => setIsEditModalOpen(true)}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>

            {/* Info Section */}
            <div>
              <p className="text-blue-200 text-sm font-medium tracking-wider uppercase mb-1">Welcome,</p>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 drop-shadow-md">
                {currentUser?.name}
              </h2>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-blue-100/80">
                <span className="bg-white/10 px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm border border-white/10 uppercase">
                  {currentUser?._id}
                </span>
                {currentUser?.studentSpecificField?.status === "Active" ? (
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                    {className || "No Class"} | {batchName || "No Batch"}
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    {batchName || "No Batch"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Status Badge for Desktop View */}
          <div className="hidden md:flex flex-col items-end gap-2 min-w-[140px]">
            {currentUser?.studentSpecificField?.status && (
              <div className={cn(
                "w-full px-4 py-1.5 rounded-xl border font-bold text-xs uppercase tracking-wider backdrop-blur-md shadow-lg flex items-center justify-center gap-2 transition-all duration-300 hover:scale-105",
                currentUser.studentSpecificField.status === "Active" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                currentUser.studentSpecificField.status === "Dropped Out" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                currentUser.studentSpecificField.status === "Graduated" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                "bg-slate-500/20 text-slate-400 border-slate-500/30"
              )}>
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  currentUser.studentSpecificField.status === "Active" ? "bg-green-400 animate-pulse ring-2 ring-green-400/20" :
                  currentUser.studentSpecificField.status === "Dropped Out" ? "bg-red-400 ring-2 ring-red-400/20" :
                  currentUser.studentSpecificField.status === "Graduated" ? "bg-blue-400 ring-2 ring-blue-400/20" :
                  "bg-slate-400"
                )} />
                {currentUser.studentSpecificField.status}
              </div>
            )}
            {!hideHeader && (
              <div className="flex flex-col items-end gap-2 w-full">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full bg-white/10 hover:bg-white/20 border-white/20 text-white gap-2 h-8 px-4 text-xs font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
                  onClick={() => setIsEditModalOpen(true)}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit Profile
                </Button>
                {currentUser?.profileUpdateStatus === "Pending" && (
                  <div className="flex flex-col items-center w-full px-4 py-1.5 rounded-xl border font-bold text-xs uppercase tracking-wider backdrop-blur-md bg-blue-500/10 text-blue-300 border-blue-500/20 animate-pulse">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      Requested
                    </div>
                    {currentUser.profileRequestDate && (
                      <span className="text-[10px] text-blue-300/60 font-medium mt-0.5">{formatDateShort(currentUser.profileRequestDate)}</span>
                    )}
                  </div>
                )}
                {currentUser?.profileUpdateStatus === "Verified" && (
                  <div className="flex flex-col items-center w-full px-4 py-1.5 rounded-xl border font-bold text-xs uppercase tracking-wider backdrop-blur-md bg-green-500/10 text-green-300 border-green-500/20">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3" />
                      Approved
                    </div>
                    {currentUser.profileActionDate && (
                      <span className="text-[10px] text-green-300/60 font-medium mt-0.5">{formatDateShort(currentUser.profileActionDate)}</span>
                    )}
                  </div>
                )}
                {currentUser?.profileUpdateStatus === "Rejected" && (
                  <div className="flex flex-col items-center w-full px-4 py-1.5 rounded-xl border font-bold text-xs uppercase tracking-wider backdrop-blur-md bg-red-500/10 text-red-300 border-red-500/20">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-3 w-3" />
                      Rejected
                    </div>
                    {currentUser.profileActionDate && (
                      <span className="text-[10px] text-red-300/60 font-medium mt-0.5">{formatDateShort(currentUser.profileActionDate)}</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl"></div>
      </div>

      {/* Navigation Cards Grid */}
      <div className="no-print grid grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {[
          { id: "PROFILE", label: "My Profile", icon: User, color: "blue" },
          { id: "ATTENDANCE", label: "Attendance", icon: Calendar, color: "rose" },
          { id: "FINANCE", label: "Finance", icon: IndianRupee, color: "emerald" },
          { id: "LIBRARY", label: "Library", icon: BookOpen, color: "amber" },
          { id: "MARKS", label: "Marks", icon: FileText, color: "indigo" },
          { id: "NOTIFICATIONS", label: "Notifications", icon: Bell, color: "cyan" },
          { id: "DOWNLOADS", label: "Downloads", icon: Download, color: "teal" },
          { id: "LEAVES", label: "Leaves", icon: Plane, color: "violet" },
          { id: "REMARKS", label: "Remarks", icon: MessageSquare, color: "orange" },
          { id: "AWARDS", label: "Awards", icon: Trophy, color: "yellow" },
          { id: "ARTICLES", label: "Articles", icon: Newspaper, color: "purple" },
          { id: "UPDATES", label: "Updates", icon: Megaphone, color: "pink" },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          // Color mapping for all navigation items
          const colorStyles = {
            blue: { activeBorder: "border-blue-500", activeBg: "bg-blue-50/50 dark:bg-blue-900/10", iconActiveBg: "bg-blue-500", iconInactiveBg: "bg-blue-100 dark:bg-blue-900/20", iconInactiveText: "text-blue-600", labelActive: "text-blue-700 dark:text-blue-300", bottomBar: "bg-blue-500" },
            emerald: { activeBorder: "border-emerald-500", activeBg: "bg-emerald-50/50 dark:bg-emerald-900/10", iconActiveBg: "bg-emerald-500", iconInactiveBg: "bg-emerald-100 dark:bg-emerald-900/20", iconInactiveText: "text-emerald-600", labelActive: "text-emerald-700 dark:text-emerald-300", bottomBar: "bg-emerald-500" },
            amber: { activeBorder: "border-amber-500", activeBg: "bg-amber-50/50 dark:bg-amber-900/10", iconActiveBg: "bg-amber-500", iconInactiveBg: "bg-amber-100 dark:bg-amber-900/20", iconInactiveText: "text-amber-600", labelActive: "text-amber-700 dark:text-amber-300", bottomBar: "bg-amber-500" },
            rose: { activeBorder: "border-rose-500", activeBg: "bg-rose-50/50 dark:bg-rose-900/10", iconActiveBg: "bg-rose-500", iconInactiveBg: "bg-rose-100 dark:bg-rose-900/20", iconInactiveText: "text-rose-600", labelActive: "text-rose-700 dark:text-rose-300", bottomBar: "bg-rose-500" },
            indigo: { activeBorder: "border-indigo-500", activeBg: "bg-indigo-50/50 dark:bg-indigo-900/10", iconActiveBg: "bg-indigo-500", iconInactiveBg: "bg-indigo-100 dark:bg-indigo-900/20", iconInactiveText: "text-indigo-600", labelActive: "text-indigo-700 dark:text-indigo-300", bottomBar: "bg-indigo-500" },
            orange: { activeBorder: "border-orange-500", activeBg: "bg-orange-50/50 dark:bg-orange-900/10", iconActiveBg: "bg-orange-500", iconInactiveBg: "bg-orange-100 dark:bg-orange-900/20", iconInactiveText: "text-orange-600", labelActive: "text-orange-700 dark:text-orange-300", bottomBar: "bg-orange-500" },
            violet: { activeBorder: "border-violet-500", activeBg: "bg-violet-50/50 dark:bg-violet-900/10", iconActiveBg: "bg-violet-500", iconInactiveBg: "bg-violet-100 dark:bg-violet-900/20", iconInactiveText: "text-violet-600", labelActive: "text-violet-700 dark:text-violet-300", bottomBar: "bg-violet-500" },
            cyan: { activeBorder: "border-cyan-500", activeBg: "bg-cyan-50/50 dark:bg-cyan-900/10", iconActiveBg: "bg-cyan-500", iconInactiveBg: "bg-cyan-100 dark:bg-cyan-900/20", iconInactiveText: "text-cyan-600", labelActive: "text-cyan-700 dark:text-cyan-300", bottomBar: "bg-cyan-500" },
            teal: { activeBorder: "border-teal-500", activeBg: "bg-teal-50/50 dark:bg-teal-900/10", iconActiveBg: "bg-teal-500", iconInactiveBg: "bg-teal-100 dark:bg-teal-900/20", iconInactiveText: "text-teal-600", labelActive: "text-teal-700 dark:text-teal-300", bottomBar: "bg-teal-500" },
            yellow: { activeBorder: "border-yellow-500", activeBg: "bg-yellow-50/50 dark:bg-yellow-900/10", iconActiveBg: "bg-yellow-500", iconInactiveBg: "bg-yellow-100 dark:bg-yellow-900/20", iconInactiveText: "text-yellow-600", labelActive: "text-yellow-700 dark:text-yellow-300", bottomBar: "bg-yellow-500" },
            purple: { activeBorder: "border-purple-500", activeBg: "bg-purple-50/50 dark:bg-purple-900/10", iconActiveBg: "bg-purple-500", iconInactiveBg: "bg-purple-100 dark:bg-purple-900/20", iconInactiveText: "text-purple-600", labelActive: "text-purple-700 dark:text-purple-300", bottomBar: "bg-purple-500" },

            pink: { activeBorder: "border-pink-500", activeBg: "bg-pink-50/50 dark:bg-pink-900/10", iconActiveBg: "bg-pink-500", iconInactiveBg: "bg-pink-100 dark:bg-pink-900/20", iconInactiveText: "text-pink-600", labelActive: "text-pink-700 dark:text-pink-300", bottomBar: "bg-pink-500" },
          };

          const s = colorStyles[item.color];

          return (
            <Card 
              key={item.id}
              className={`cursor-pointer transition-all duration-300 border-2 hover:shadow-lg group relative overflow-hidden ${
                isActive 
                  ? `${s.activeBorder} ${s.activeBg}` 
                  : "border-transparent bg-white dark:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-800"
              }`}
              onClick={() => handleTabChange(item.id)}
            >
              <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-3">
                <div className={`p-3 rounded-xl transition-all duration-300 ${
                  isActive 
                    ? `${s.iconActiveBg} text-white shadow-lg scale-110` 
                    : `${s.iconInactiveBg} ${s.iconInactiveText} group-hover:scale-110`
                }`}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className={`text-sm font-bold tracking-wide ${
                  isActive ? s.labelActive : "text-slate-600 dark:text-slate-400"
                }`}>
                  {item.label}
                </span>
                {isActive && (
                  <div className={`absolute bottom-0 left-0 w-full h-1 ${s.bottomBar}`}></div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="space-y-6" ref={detailsRef}>
        {isLoading && !initialData ? (
          <Card className="min-h-[400px] flex flex-col items-center justify-center p-12 bg-white/50 backdrop-blur-sm border-dashed">
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              <div className="absolute inset-0 blur-xl bg-blue-500/20 rounded-full animate-pulse"></div>
            </div>
            <p className="mt-6 text-base font-medium text-slate-600 animate-pulse tracking-wide italic">
              Loading your personalized dashboard...
            </p>
          </Card>
        ) : (
          <>
            {/* Current inline profile header for Print only */}
            <Card className="hidden print:block bg-blue-50 dark:bg-blue-950 border-blue-100 dark:border-blue-900 shadow-none card-print-break mb-6">
          <CardContent className="p-5 flex items-center gap-6">
            <Avatar className="h-24 w-24 rounded-lg flex-shrink-0">
              <AvatarImage src={currentUser?.profilePic?.url} alt={currentUser?.name} />
              <AvatarFallback>{currentUser?.name?.[0]}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 flex flex-col justify-center">
              <h2 className="text-xl font-bold mb-0.5">{currentUser?.name}</h2>
              
              <div className="grid grid-cols-[60px_10px_1fr] items-center text-sm text-muted-foreground">
                <span className="font-medium text-foreground text-sm">ID</span>
                <span className="text-sm">:</span>
                <span className="text-sm">{currentUser?._id}</span>
                
                {currentUser?.studentSpecificField?.status === "Active" && (
                  <>
                    <span className="font-medium text-foreground text-sm">Class</span>
                    <span className="text-sm">:</span>
                    <span className="text-sm">{className || "N/A"}</span>
                  </>
                )}
                
                <span className="font-medium text-foreground text-sm">Batch</span>
                <span className="text-sm">:</span>
                <span className="text-sm">{batchName || "N/A"}</span>
                
                <span className="font-medium text-foreground text-sm">Status</span>
                <span className="text-sm">:</span>
                <div className="flex">
                  <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${getStatusClass(currentUser?.studentSpecificField?.status)}`}>
                    {currentUser?.studentSpecificField?.status}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      {activeTab === "PROFILE" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {/* Personal Information */}
          <Card className="card-print-break h-full shadow-sm">
          <CardHeader>
            <CardTitle>Personal Info</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-[max-content_12px_1fr] items-start">
            <ProfileField
              label="Date of Birth"
              value={formatDateShort(currentUser?.dateOfBirth)}
            />
            <ProfileField
              label="Blood Group"
              value={currentUser?.studentSpecificField?.bloodGroup || currentUser?.bloodGroup}
            />
            <ProfileField
              label="Aadhar No"
              value={currentUser?.studentSpecificField?.aadharNo || currentUser?.aadharNo}
            />
            {currentUser?.address && (
              <>
                <div className="text-sm font-medium text-muted-foreground py-1">
                  Address
                </div>
                <div className="text-sm px-1 py-1">:</div>
                <div className="text-sm text-foreground py-1">
                  {currentUser.address.houseName && (
                    <div>{currentUser.address.houseName}</div>
                  )}
                  {(currentUser.address.place || currentUser.address.postOffice) && (
                    <div>
                      {[currentUser.address.place, currentUser.address.postOffice]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  )}
                  {(currentUser.address.district ||
                    currentUser.address.state ||
                    currentUser.address.pin) && (
                      <div>
                        {[currentUser.address.district, currentUser.address.state]
                          .filter(Boolean)
                          .join(", ")}
                        {currentUser.address.pin && ` - ${currentUser.address.pin}`}
                      </div>
                    )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

          {/* Academic Info */}
          <Card className="card-print-break h-full shadow-sm">
          <CardHeader>
            <CardTitle>Academic Info</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-[max-content_12px_1fr] items-start">
            <ProfileField label="Batch" value={batchName} />
            <ProfileField
              label="Admission Class"
              value={admissionClassName}
            />
            <ProfileField
              label="Admission Date"
              value={formatDateShort(
                currentUser?.studentSpecificField?.admissionDate || currentUser?.admissionDate
              )}
            />
            <ProfileField
              label="Islamic Qualif."
              value={currentUser?.studentSpecificField?.islamicQualification || currentUser?.islamicQualification}
            />
            <ProfileField
              label="Academic Qualif."
              value={currentUser?.studentSpecificField?.academicQualification || currentUser?.academicQualification}
            />
            <ProfileField
              label="Graduated Year"
              value={currentUser?.studentSpecificField?.graduatedYear || currentUser?.graduatedYear}
            />
            {currentUser?.studentSpecificField?.status === "Dropped Out" && (
              <>
                <ProfileField
                  label="Dropout Date"
                  value={formatDateShort(currentUser?.studentSpecificField?.droppedOutDate)}
                />
                <ProfileField
                  label="Dropout Class"
                  value={classes?.find(c => c._id === currentUser?.studentSpecificField?.droppedOutClass)?.name || currentUser?.studentSpecificField?.droppedOutClass}
                />
                <ProfileField
                  label="Dropout Reason"
                  value={currentUser?.studentSpecificField?.droppedOutReason}
                />
              </>
            )}
          </CardContent>
        </Card>

          {/* Contact Info */}
          <Card className="card-print-break h-full shadow-sm">
          <CardHeader>
            <CardTitle>Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-[max-content_12px_1fr] items-start">
            <ProfileField label="Email" value={currentUser?.email} />
            <ProfileField label="Contact No" value={currentUser?.contactNumber} />
            <ProfileField
              label="Alt. Contact"
              value={currentUser?.alternativeNumber}
            />
            <ProfileField
              label="Guardian"
              value={currentUser?.studentSpecificField?.guardianName || currentUser?.guardianName}
            />
            <ProfileField
              label="G. Contact"
              value={currentUser?.studentSpecificField?.guardianContactNumber || currentUser?.guardianContactNumber}
            />
            <ProfileField
              label="G. Alt. Contact"
              value={currentUser?.studentSpecificField?.guardianAlternativeNumber || currentUser?.guardianAlternativeNumber}
            />
          </CardContent>
        </Card>

        {showKinship && (currentUser?.studentSpecificField?.familyDetails?.length > 0 || currentUser?.familyOtherDetails) && (
          <Card className="card-print-break shadow-sm col-span-full mt-2">
            <CardHeader className="bg-muted/10 border-b py-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Kinship Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {currentUser?.studentSpecificField?.familyDetails?.length > 0 && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-16 text-center">Sl.No</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-center">Age</TableHead>
                        <TableHead>Education</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Mobile</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentUser.studentSpecificField.familyDetails.map((member, index) => (
                        <TableRow key={index} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="text-center text-muted-foreground font-medium">{index + 1}</TableCell>
                          <TableCell className="font-semibold">{member.position}</TableCell>
                          <TableCell className="uppercase text-blue-600 font-medium">{member.name}</TableCell>
                          <TableCell className="text-center">{member.age || "-"}</TableCell>
                          <TableCell>{member.education || "-"}</TableCell>
                          <TableCell>{member.status || "-"}</TableCell>
                          <TableCell className="whitespace-nowrap font-mono text-xs">{member.mobileNumber || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {currentUser?.familyOtherDetails && (
                <div className="p-4 bg-muted/5 border-t">
                  <h4 className="text-xs font-bold mb-2 flex items-center gap-2 text-muted-foreground uppercase tracking-widest">
                    <MessageSquare className="h-3.5 w-3.5" />
                    General Notes
                  </h4>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                    {currentUser.familyOtherDetails}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      )}

      {activeTab === "FINANCE" && (
        <div className="space-y-6">
        <Card className="bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900 card-print-break shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
              <Clock className="h-5 w-5" />
              Pending Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-y-auto pr-2 rounded-md border min-h-[100px]">
              {fundsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading financial records...</span>
                </div>
              ) : displayFunds && displayFunds.length > 0 ? (
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-[60px] py-2">Sl No</TableHead>
                      <TableHead className="py-2">Fund Name</TableHead>
                      <TableHead className="py-2 text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayFunds.map((item, index) => (
                      <TableRow key={index} className="group hover:bg-muted/30 transition-colors">
                        <TableCell className="py-2 text-muted-foreground font-medium">{index + 1}</TableCell>
                        <TableCell className="py-2">
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-emerald-900 dark:text-emerald-200">{item.label}</span>
                            {item.subLabel && <span className="text-[10px] text-muted-foreground uppercase">{item.subLabel}</span>}
                          </div>
                        </TableCell>
                        <TableCell 
                          className={`py-2 text-right font-bold text-sm cursor-pointer hover:underline decoration-dotted ${item.value < 0 ? 'text-red-600' : 'text-green-600'}`}
                          onClick={() => {
                            if (item.isCoupon) {
                              setIsCouponModalOpen(true);
                            } else if (item.isInteractive) {
                              setSelectedStandardFund(item);
                              setIsStandardModalOpen(true);
                            }
                          }}
                        >
                          {(item.value || 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Total Summary Row */}
                    <TableRow className="bg-muted/40 font-bold border-t-2 border-muted hover:bg-muted/40">
                      <TableCell colSpan={2} className="py-3 text-emerald-800 dark:text-emerald-300 uppercase tracking-wider text-xs">
                        Total Pending Balance
                      </TableCell>
                      <TableCell className={`py-3 text-right text-base ${totalPending < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {(totalPending || 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                   <Clock className="h-8 w-8 opacity-20" />
                   <p className="text-sm italic">No pending transactions found.</p>
                </div>
              )}
            </div>

              {/* Standard Fund Details Modal */}
              <Dialog open={isStandardModalOpen} onOpenChange={setIsStandardModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{selectedStandardFund?.label} Details</DialogTitle>
                  </DialogHeader>
                  <div className="mt-4 space-y-8">
                    {/* Collection Breakdown */}
                    <div>
                      <h3 className="text-sm font-bold mb-3 uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Collection Breakdown
                      </h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Year (Batch)</TableHead>
                            <TableHead>Role Holder</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(selectedStandardFund?.records || []).map((record, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{record.year}</TableCell>
                              <TableCell>{record.holder}</TableCell>
                              <TableCell className="text-right font-bold text-orange-600">
                                {(record.value || 0).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Full Transaction History */}
                    <div>
                      <h3 className="text-sm font-bold mb-3 uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Fund History
                      </h3>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader className="bg-muted/50">
                            <TableRow>
                              <TableHead className="py-2">Date</TableHead>
                              <TableHead className="py-2 text-right">Addition / Deduction</TableHead>
                              <TableHead className="py-2 text-right">Balance</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedStandardFund?.allTransactions && selectedStandardFund.allTransactions.length > 0 ? (
                              [...selectedStandardFund.allTransactions]
                                .sort((a, b) => new Date(b.date) - new Date(a.date)) // Newest first for display
                                .map((t, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell className="py-2 text-[10px] leading-tight">
                                      <div className="flex flex-col">
                                        <span className="font-medium">{formatDateShort(t.date)}</span>
                                        <span className="text-muted-foreground">
                                          {new Date(t.date).toLocaleTimeString("en-US", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            hour12: true,
                                          })}
                                        </span>
                                      </div>
                                    </TableCell>
                                    <TableCell className={`py-2 text-xs text-right font-bold ${t.type === 'Withdrawal' ? 'text-red-600' : 'text-green-600'}`}>
                                      {t.type === 'Withdrawal' ? '-' : '+'}{(t.amount || 0).toFixed(2)}
                                    </TableCell>
                                    <TableCell className={`py-2 text-xs text-right font-bold ${t.calculatedBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                      {t.calculatedBalance?.toFixed(2) || "0.00"}
                                    </TableCell>
                                  </TableRow>
                                ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={3} className="text-center py-6 text-muted-foreground text-xs italic">
                                  No transaction history found for this fund.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Coupon Details Modal */}
              <Dialog open={isCouponModalOpen} onOpenChange={setIsCouponModalOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Coupon Fund Details</DialogTitle>
                  </DialogHeader>
                  <div className="mt-4">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="py-2 w-[60px]">Sl No</TableHead>
                          <TableHead className="py-2">Year</TableHead>
                          <TableHead className="py-2">Coupon No.</TableHead>
                          <TableHead className="py-2 text-right">Fund</TableHead>
                          <TableHead className="py-2 text-right">Total Paid</TableHead>
                          <TableHead className="py-2 text-right">Balance</TableHead>
                          <TableHead className="py-2">Payment History</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {couponDetails.map((coupon, index) => {
                          const paid = (coupon.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
                          const balance = (coupon.couponAmount || 0) - paid;
                          return (
                            <TableRow key={coupon._id} className="align-top">
                              <TableCell className="py-3 text-muted-foreground">{index + 1}</TableCell>
                              <TableCell className="py-3 font-bold text-sm">
                                {coupon.academicYear}
                              </TableCell>
                              <TableCell className="py-3 text-sm">
                                {coupon.couponNumber || "N/A"}
                              </TableCell>
                              <TableCell className="py-3 text-right text-sm">₹{(coupon.couponAmount || 0).toFixed(2)}</TableCell>
                              <TableCell className="py-3 text-right text-sm text-green-600">₹{(paid || 0).toFixed(2)}</TableCell>
                              <TableCell className="py-3 text-right font-bold text-orange-600 text-sm">
                                ₹{(balance || 0).toFixed(2)}
                              </TableCell>
                              <TableCell className="py-2">
                                <div className="space-y-1">
                                  {coupon.payments && coupon.payments.length > 0 ? (
                                    coupon.payments.map((p, pIdx) => (
                                      <div key={pIdx} className="flex items-center justify-between gap-4 text-[10px] bg-muted/30 px-2 py-1 rounded border border-muted/50">
                                        <span className="text-muted-foreground">{formatDateShort(p.date)}</span>
                                        <span className="font-bold text-green-700">₹{(p.amount || 0).toFixed(2)}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground italic">No payments recorded</span>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {couponDetails.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                              No coupon records found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </DialogContent>
              </Dialog>

          </CardContent>
        </Card>


      </div>
      )}

      {activeTab === "LIBRARY" && (
        <Card className="lg:col-span-2 print:col-span-2 card-print-break shadow-sm">
          <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-4 pb-2 border-b mb-4 relative">
            <div className="flex items-center bg-muted rounded-lg p-1 w-full md:w-auto order-2 md:order-1">
              {isActiveStudent && (
                <Button
                  variant={librarySubTab === "BOOKS" ? "secondary" : "ghost"}
                  size="sm"
                  className={`flex-1 md:flex-none md:w-28 h-8 rounded-md transition-all ${librarySubTab === "BOOKS" ? "bg-white shadow-sm font-bold" : ""}`}
                  onClick={() => setLibrarySubTab("BOOKS")}
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Books
                </Button>
              )}
              <Button
                variant={librarySubTab === "HISTORY" ? "secondary" : "ghost"}
                size="sm"
                className={`flex-1 md:flex-none md:w-28 h-8 rounded-md transition-all ${librarySubTab === "HISTORY" ? "bg-white shadow-sm font-bold" : ""}`}
                onClick={() => setLibrarySubTab("HISTORY")}
              >
                <List className="h-4 w-4 mr-2" />
                History
              </Button>
            </div>
            <CardTitle className="flex items-center gap-2 text-center md:absolute md:left-1/2 md:-translate-x-1/2 order-1 md:order-2">
              <BookOpen className="h-5 w-5 text-amber-500" />
              Library Services
            </CardTitle>
            <div className="hidden md:block w-56 order-3" /> {/* Spacer to balance the left buttons */}
          </CardHeader>
          <CardContent className="pt-2">
            {librarySubTab === "BOOKS" && isActiveStudent ? (
              <div className="space-y-4">
                {libraryBooksLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
                  </div>
                ) : (
                  <TableComponent
                    data={libraryBooks}
                    getRowId={(row) => row._id}
                    tableHeight="calc(100vh - 450px)"
                    hidePrintBtn={true}
                    hideColumnManagement={true}
                    enableGrid={true}
                    defaultViewMode="grid"
                    hideViewToggle={true}
                    columnsConfig={[
                      { accessorKey: "number", header: "Book ID" },
                      { accessorKey: "name", header: "Book Name" },
                      { accessorKey: "author", header: "Author" },
                      { accessorKey: "category", header: "Category" },
                      { accessorKey: "language", header: "Language" },
                      { accessorKey: "status", header: "Status" },
                    ]}
                    filterConfig={[
                      {
                        id: "category",
                        label: "Category",
                        inputType: "select",
                        options: Array.from(new Set(libraryBooks.map(b => b.category))).filter(Boolean).map(c => ({ value: c, label: c }))
                      },
                      {
                        id: "language",
                        label: "Language",
                        inputType: "select",
                        options: Array.from(new Set(libraryBooks.map(b => b.language))).filter(Boolean).map(l => ({ value: l, label: l }))
                      },
                      {
                        id: "status",
                        label: "Status",
                        inputType: "select",
                        options: [
                          { value: "Available", label: "Available" },
                          { value: "Rented", label: "Rented" },
                        ]
                      }
                    ]}
                    renderGridItem={(row) => {
                      const book = row.original;
                      return (
                        <Card className="h-full hover:shadow-md transition-shadow overflow-hidden border border-border/50">
                          <CardContent className="p-4 flex gap-4 items-start">
                            <div className="flex-shrink-0 flex flex-col items-center gap-1.5 w-20">
                              <div className="bg-muted/50 dark:bg-muted/20 p-2 rounded-md flex items-center justify-center h-16 w-16 border border-border/50">
                                <BookOpen className="h-6 w-6 text-muted-foreground" />
                              </div>
                              <div className="text-center w-full space-y-1">
                                <div className="text-[10px] font-bold text-muted-foreground uppercase bg-muted/80 py-0.5 rounded border">ID: {book.number}</div>
                                <div className="font-bold text-[11px] text-foreground">₹{book.price?.toFixed(2) || "0.00"}</div>
                                <div className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider inline-block ${book.status === 'Available' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                                  {(book.status === 'Pending' || book.status === 'Rented') ? 'Rented' : (book.status || "Unknown")}
                                </div>
                              </div>
                            </div>
                            <div className="flex-1 space-y-1 min-w-0 py-1 flex flex-col h-full">
                              <div className="flex-1">
                                <h3 className="font-bold text-base leading-tight break-words mb-1 text-foreground" title={book.name}>{book.name}</h3>
                                <div className="text-xs text-muted-foreground truncate" title={book.author}>Author: <span className="text-foreground font-medium">{book.author}</span></div>
                                {book.publication && <div className="text-xs text-muted-foreground truncate" title={book.publication}>Pub: <span className="text-foreground">{book.publication}</span></div>}
                                <div className="text-[11px] mt-1 flex flex-wrap gap-1">
                                  <span className="bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{book.language}</span>
                                  <span className="bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{book.category}</span>
                                </div>
                              </div>
                              <div className="pt-1 flex flex-col gap-2 mt-auto">
                                <div className="flex items-center gap-2 w-full">
                                  {/* Barcode in the same row */}
                                  <div className="flex-1 flex justify-center items-center h-7 overflow-hidden bg-white rounded border border-border/50 shadow-sm p-0.5">
                                    {book.number && (
                                      <Barcode
                                        value={String(book.number)}
                                        width={0.6}
                                        height={20}
                                        fontSize={0}
                                        margin={0}
                                        displayValue={false}
                                        background="transparent"
                                      />
                                    )}
                                  </div>

                                  <div className="flex-1">
                                    {pendingRequests.some(r => r.bookId?._id === book._id || r.bookId === book._id) ? (
                                      <Button disabled size="sm" className="w-full h-7 text-[10px] font-bold">
                                        Requested
                                      </Button>
                                    ) : book.status !== "Available" ? (
                                      <Button disabled size="sm" className="w-full h-7 text-[10px] font-bold bg-muted text-muted-foreground">
                                        Not Available
                                      </Button>
                                    ) : (
                                      <Button 
                                        size="sm" 
                                        className="w-full h-7 text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white"
                                        onClick={() => handleRequestBook(book)}
                                      >
                                        Request
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }}
                  />
                )}
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto pr-2">
                {rentalsLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
                  </div>
                ) : rentalHistory && rentalHistory.length > 0 ? (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="w-[60px]">Sl No</TableHead>
                          <TableHead>Book Name</TableHead>
                          <TableHead>Rented Date</TableHead>
                          <TableHead>Returned Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rentalHistory.map((rental, index) => (
                          <TableRow key={rental._id}>
                            <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                            <TableCell className="font-medium">
                              {rental.bookId?.name || "Unknown Book"}
                              <div className="text-xs text-muted-foreground">
                                {rental.bookId?.prefix && rental.bookId?.number
                                  ? `${rental.bookId.prefix}-${rental.bookId.number}`
                                  : rental.bookId?.number || "N/A"}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                {formatDateWithoutDay(rental.rentedDate)}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {rental.receivedDate ? (
                                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                  <Clock className="h-3 w-3" />
                                  {formatDateWithoutDay(rental.receivedDate)}
                                </div>
                              ) : (
                                <span className="text-orange-600 dark:text-orange-400 font-medium">
                                  Currently Reading
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-20 text-muted-foreground">
                    <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p>No book rental history found.</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "MARKS" && (
        <div className="grid grid-cols-1 gap-5 pt-5 print-stack-vertical">
          <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-500" />
                Exam Marks
              </CardTitle>
            </div>
            {marks && marks.length > 0 && (
              <div className="no-print">
                <Select onValueChange={setSelectedExamId} value={selectedExamId}>
                  <SelectTrigger className="w-[180px] h-8 text-xs">
                    <SelectValue placeholder="Select Exam" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Exams</SelectItem>
                    {marks.map((exam) => (
                      <SelectItem key={exam._id} value={exam._id}>
                        {exam.examName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardHeader>
          <CardContent className="flex-1">
            <div className="max-h-[400px] overflow-y-auto pr-2">
              {marksLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : marks && marks.length > 0 ? (
                <div className="space-y-6">
                  {marks
                    .filter((exam) => selectedExamId === "all" || exam._id === selectedExamId)
                    .map((exam) => {
                      const studentMarks = exam.students.find(s => s.studentId?._id === currentUser._id || s.studentId === currentUser._id);
                      if (!studentMarks) return null;

                      // Calculate totals, percentage, and rank
                      let studentTotal = 0;
                      let maxTotal = 0;
                      exam.subjects.forEach(subject => {
                        const m = studentMarks.marks?.[subject.name];
                        if (subject.subColumns && subject.subColumns.length > 0) {
                            subject.subColumns.forEach(sc => {
                                studentTotal += (m && typeof m === 'object') ? (Number(m[sc.name]) || 0) : 0;
                                maxTotal += Number(sc.maxMark) || 0;
                            });
                        } else {
                            studentTotal += Number(m) || 0;
                            maxTotal += subject.maxMark || 100;
                        }
                      });
                      const percentage = maxTotal > 0 ? ((studentTotal / maxTotal) * 100).toFixed(2) : 0;

                      // Rank calculation
                      const allStudentTotals = exam.students.map(s => {
                        let total = 0;
                        exam.subjects.forEach(subject => {
                          const m = s.marks?.[subject.name];
                          if (subject.subColumns && subject.subColumns.length > 0) {
                              subject.subColumns.forEach(sc => {
                                  total += (m && typeof m === 'object') ? (Number(m[sc.name]) || 0) : 0;
                              });
                          } else {
                              total += Number(m) || 0;
                          }
                        });
                        return { studentId: s.studentId?._id || s.studentId, total };
                      });
                      allStudentTotals.sort((a, b) => b.total - a.total);
                      const rank = allStudentTotals.findIndex(s => s.studentId === currentUser._id) + 1;

                      // Collect all unique sub-column names for this exam
                      const subColNames = [];
                      exam.subjects.forEach(subject => {
                        if (subject.subColumns && subject.subColumns.length > 0) {
                          subject.subColumns.forEach(sc => {
                            if (!subColNames.includes(sc.name)) {
                              subColNames.push(sc.name);
                            }
                          });
                        }
                      });

                      return (
                        <div key={exam._id} className="space-y-1 print-exam-card">
                          <div className="rounded-md border overflow-hidden">
                            <Table>
                              <TableHeader className="bg-muted/50">
                                <TableRow>
                                  <TableHead colSpan={3 + subColNames.length} className="text-center font-bold text-sm h-10 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300">
                                    {exam.examName}
                                  </TableHead>
                                </TableRow>
                                <TableRow className="bg-muted/30">
                                  <TableHead className="py-2 text-xs">Subject</TableHead>
                                  {subColNames.map(name => (
                                    <TableHead key={name} className="py-2 text-xs text-center">{name}</TableHead>
                                  ))}
                                  <TableHead className="py-2 text-xs text-center">Total</TableHead>
                                  <TableHead className="py-2 text-xs text-center">Result</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {exam.subjects.map((subject, sIndex) => {
                                  const rawMark = studentMarks.marks?.[subject.name];
                                  let markTotal = 0;
                                  let maxMarkTotal = subject.maxMark || 100;
                                  let isPass = true;
                                  const hasSubCols = subject.subColumns && subject.subColumns.length > 0;
                                  
                                  if (hasSubCols) {
                                      maxMarkTotal = 0;
                                      subject.subColumns.forEach(sc => {
                                          const scVal = (rawMark && typeof rawMark === 'object') ? (Number(rawMark[sc.name]) || 0) : 0;
                                          markTotal += scVal;
                                          maxMarkTotal += Number(sc.maxMark) || 0;
                                          if (scVal < (Number(sc.passMark) || 0)) isPass = false;
                                      });
                                  } else {
                                      markTotal = Number(rawMark) || 0;
                                      if (markTotal < (subject.passMark || 40)) isPass = false;
                                  }
                                  
                                  const displayMark = (rawMark === undefined || rawMark === null) ? "N/A" : markTotal;

                                  return (
                                    <TableRow key={`${subject.name}-${sIndex}`}>
                                      <TableCell className="py-2 text-sm font-medium">
                                          {subject.name}
                                      </TableCell>
                                      {subColNames.map(name => {
                                        let val = "-";
                                        if (hasSubCols) {
                                          const sc = subject.subColumns.find(col => col.name === name);
                                          if (sc) {
                                            const scVal = (rawMark && typeof rawMark === 'object') ? rawMark[sc.name] : undefined;
                                            val = scVal !== undefined ? scVal : "-";
                                          }
                                        }
                                        return (
                                          <TableCell key={name} className="py-2 text-sm text-center">
                                            {val}
                                          </TableCell>
                                        );
                                      })}
                                      <TableCell className="py-2 text-sm text-center">
                                        <span className="font-semibold">{displayMark}</span> <span className="text-xs text-muted-foreground">/ {maxMarkTotal}</span>
                                      </TableCell>
                                      <TableCell className="py-2 text-center">
                                        {displayMark !== "N/A" ? (
                                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${isPass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {isPass ? 'Pass' : 'Fail'}
                                          </span>
                                        ) : "-"}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                                {/* Summary Row */}
                                <TableRow className="bg-indigo-50/30 dark:bg-indigo-950/20 font-bold border-t-2">
                                  <TableCell colSpan={1 + subColNames.length} className="py-2 text-sm text-indigo-700 dark:text-indigo-300">SUMMARY</TableCell>
                                  <TableCell className="py-2 text-sm text-center">
                                    <div className="flex flex-col">
                                      <span>{studentTotal} / {maxTotal}</span>
                                      <span className="text-[10px] text-muted-foreground">{percentage}%</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-2 text-center">
                                    <div className="inline-flex items-center gap-1 bg-indigo-100 dark:bg-indigo-900 px-2 py-0.5 rounded text-indigo-700 dark:text-indigo-300">
                                      <span className="text-[10px] font-bold">RANK</span>
                                      <span className="text-sm">#{rank}</span>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>

                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <BookOpen className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-sm">No exam marks records found.</p>
                </div>
              )}
            </div>
          </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "ATTENDANCE" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-5 print-stack-vertical">
          {/* Attendance History */}
          <Card className="card-print-break">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-bold">Attendance History</CardTitle>
              <div className="no-print">
                <Select
                  onValueChange={(value) => setSelectedYear(parseInt(value))}
                  defaultValue={selectedYear.toString()}
                >
                  <SelectTrigger className="w-[100px] h-8 text-xs">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-[400px] overflow-y-auto pr-2">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="py-2 text-xs">Month</TableHead>
                      <TableHead className="py-2 text-xs">Total</TableHead>
                      <TableHead className="py-2 text-xs">Present</TableHead>
                      <TableHead className="py-2 text-xs text-right">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttendanceHistory.length > 0 ? (
                      filteredAttendanceHistory.map((row) => (
                        <React.Fragment key={row.monthYear}>
                          <TableRow
                            onClick={() =>
                              setExpandedMonth(
                                expandedMonth === row.monthYear ? null : row.monthYear
                              )
                            }
                            className="cursor-pointer hover:bg-muted/50"
                          >
                            <TableCell className="py-2 text-sm font-medium">{row.month}</TableCell>
                            <TableCell className="py-2 text-sm">{row.totalPeriods}</TableCell>
                            <TableCell className="py-2 text-sm">{row.presentPeriods}</TableCell>
                            <TableCell className="py-2 text-sm text-right">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${parseFloat(row.percentage) > 80 ? 'bg-green-100 text-green-700' :
                                parseFloat(row.percentage) >= 50 ? 'bg-orange-100 text-orange-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                {row.percentage}%
                              </span>
                            </TableCell>
                          </TableRow>
                          {expandedMonth === row.monthYear && (
                            <TableRow className="bg-muted/30">
                              <TableCell colSpan={4} className="p-0">
                                <div className="p-4">
                                  <Table className="border rounded-md bg-background">
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="h-8 py-1">Date</TableHead>
                                        <TableHead className="h-8 py-1">Subject (Teacher)</TableHead>
                                        <TableHead className="h-8 py-1 text-center">Status</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {row.details.map((detail, dIdx) => (
                                        <TableRow key={`${detail.date}-${dIdx}`} className="h-8">
                                          <TableCell className="py-1 text-xs">{detail.date}</TableCell>
                                          <TableCell className="py-1 text-xs font-medium">
                                            {detail.subject} <span className="text-muted-foreground font-normal">({detail.teacher})</span>
                                          </TableCell>
                                          <TableCell className="py-1 text-center">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${detail.present ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
                                              }`}>
                                              {detail.present ? "Present" : "Absent"}
                                            </span>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-sm">
                          No records found for {selectedYear}.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Chart */}
          <Card className="card-print-break flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Attendance Chart ({selectedYear})</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex items-center justify-center">
              <div className="w-full h-full min-h-[300px] overflow-x-auto pb-2 flex justify-start">
                <BarChart
                  width={Math.max(300, filteredAttendanceHistory.length * 60 + 60)}
                  height={400}
                  data={filteredAttendanceHistory}
                  margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
                  barCategoryGap={20}
                >
                  <XAxis dataKey="month" tick={false} padding={{ left: 10, right: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend verticalAlign="top" align="right" />
                  <Bar
                    dataKey="percentage"
                    radius={[4, 4, 0, 0]}
                    barSize={40}
                  >
                    <LabelList 
                      dataKey="month" 
                      position="center" 
                      angle={-90} 
                      fill="white"
                      style={{ 
                        fontWeight: 'bold', 
                        fontSize: '9px',
                        textTransform: 'uppercase',
                        pointerEvents: 'none'
                      }}
                    />
                    {filteredAttendanceHistory.map((entry, index) => {
                      const p = parseFloat(entry.percentage);
                      const color = p > 80 ? "#22c55e" : p >= 50 ? "#ea580c" : "#ef4444";
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "LEAVES" && (
        <Card className="flex flex-col card-print-break mt-5 border-violet-100 dark:border-violet-900 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Plane className="h-5 w-5 text-violet-500" />
              Leave History
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="max-h-[400px] overflow-y-auto pr-2">
              {leavesLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (leavesList && leavesList.length > 0) ? (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[60px] py-3 pl-4 text-xs font-bold uppercase tracking-wider">Sl No</TableHead>
                        <TableHead className="py-3 text-xs font-bold uppercase tracking-wider min-w-[100px]">Date of Leave</TableHead>
                        <TableHead className="py-3 text-xs font-bold uppercase tracking-wider">Leave Reason</TableHead>
                        <TableHead className="py-3 text-xs font-bold uppercase tracking-wider min-w-[100px]">Exp. Arrival</TableHead>
                        <TableHead className="py-3 text-xs font-bold uppercase tracking-wider min-w-[100px]">Actual Arrival</TableHead>
                        <TableHead className="py-3 text-xs font-bold uppercase tracking-wider">Late Reason</TableHead>
                        <TableHead className="py-3 text-xs font-bold uppercase tracking-wider">Remark</TableHead>
                        <TableHead className="py-3 text-xs font-bold uppercase tracking-wider text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...leavesList]
                        .sort((a, b) => new Date(b.dateOfLeave) - new Date(a.dateOfLeave))
                        .map((leave, index) => (
                        <TableRow key={leave._id} className="group hover:bg-muted/30 transition-colors">
                          <TableCell className="py-3 pl-4 text-sm text-muted-foreground font-medium">{index + 1}</TableCell>
                          <TableCell className="py-3 text-sm font-bold text-violet-700 dark:text-violet-300">
                            {formatDateShort(leave.dateOfLeave)}
                          </TableCell>
                          <TableCell className="py-3">
                            <p className="text-sm text-foreground leading-relaxed italic line-clamp-1" title={leave.leaveReason}>
                              {leave.leaveReason}
                            </p>
                          </TableCell>
                          <TableCell className="py-3 text-sm font-medium text-slate-600 dark:text-slate-400">
                            {formatDateShort(leave.dateOfArrival)}
                          </TableCell>
                          <TableCell className="py-3 text-sm font-bold text-green-600 dark:text-green-400">
                            {leave.arrivedDate ? formatDateShort(leave.arrivedDate) : "N/A"}
                          </TableCell>
                          <TableCell className="py-3 text-sm text-muted-foreground">
                            {leave.lateReason || "-"}
                          </TableCell>
                          <TableCell className="py-3 text-sm text-muted-foreground">
                            {leave.remark || "-"}
                          </TableCell>
                          <TableCell className="py-3 text-center">
                            {leave.arrivedDate ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                <span className="h-1 w-1 rounded-full bg-green-500" />
                                Returned
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 animate-pulse">
                                <span className="h-1 w-1 rounded-full bg-orange-500" />
                                On Leave
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <Plane className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-sm">No leave records found.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "REMARKS" && (
        <Card className="flex flex-col card-print-break mt-5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Student Remarks
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="max-h-[400px] overflow-y-auto pr-2">
              {remarksLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (remarksList && remarksList.length > 0) ? (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[60px] py-3 pl-4 text-xs">Sl No</TableHead>
                        <TableHead className="py-3 text-xs">Date</TableHead>
                        <TableHead className="py-3 text-xs w-[40%]">Remarks</TableHead>
                        <TableHead className="py-3 text-xs">Teacher</TableHead>
                        <TableHead className="py-3 text-xs text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...remarksList]
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .map((remark, index) => (
                        <TableRow key={remark._id} className="group hover:bg-muted/30 transition-colors">
                          <TableCell className="py-3 pl-4 text-sm text-muted-foreground font-medium">{index + 1}</TableCell>
                          <TableCell className="py-3 text-sm font-medium">
                            {formatDateShort(remark.date)}
                          </TableCell>
                          <TableCell className="py-3">
                            <p className="text-sm text-foreground leading-relaxed italic">"{remark.comments}"</p>
                          </TableCell>
                          <TableCell className="py-3 text-sm text-muted-foreground">
                            {remark.teacherName || "N/A"}
                          </TableCell>
                          <TableCell className="py-3 text-center">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              remark.status === 'very good' || remark.status === 'good' ? 'bg-green-100 text-green-700' :
                              remark.status === 'acceptable' ? 'bg-blue-100 text-blue-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {remark.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <Clock className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-sm">No remarks records found.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "NOTIFICATIONS" && (
        <Card className="flex flex-col card-print-break mt-5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Bell className="h-5 w-5 text-cyan-500" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div className="p-5 rounded-2xl bg-cyan-100 dark:bg-cyan-900/20 mb-4">
                <Bell className="h-10 w-10 text-cyan-500 opacity-60" />
              </div>
              <p className="text-base font-semibold text-cyan-700 dark:text-cyan-300 mb-1">No Notifications</p>
              <p className="text-sm text-muted-foreground">You have no notifications at this time.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "DOWNLOADS" && (
        <Card className="flex flex-col card-print-break mt-5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Download className="h-5 w-5 text-teal-500" />
              Downloads
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <DownloadsTabContent apiKey={apiKey} />
          </CardContent>
        </Card>
      )}

      {activeTab === "AWARDS" && (
        <Card className="flex flex-col card-print-break mt-5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Awards &amp; Achievements
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <AwardsTabContent currentUser={currentUser} apiKey={apiKey} />
          </CardContent>
        </Card>
      )}

      {activeTab === "ARTICLES" && (
        <Card className="flex flex-col card-print-break mt-5 border-purple-100 dark:border-purple-900 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b mb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-purple-500" />
              Articles
            </CardTitle>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {articles?.length || 0} Total Articles
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            {articlesLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              </div>
            ) : articles && articles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map((article, idx) => (
                  <div key={article._id || idx} className="group overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col bg-white dark:bg-slate-900 rounded-2xl cursor-default h-full">
                    {article.image?.url ? (
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <img
                          src={article.image.url}
                          alt={article.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      </div>
                    ) : (
                      <div className="aspect-[16/10] bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors">
                        <Newspaper className="w-12 h-12 text-purple-200 group-hover:text-purple-300 transition-colors" />
                      </div>
                    )}
                    <div className="flex-1 p-5 md:p-6 flex flex-col">
                      <div className="flex items-center gap-2 text-purple-600 text-xs font-bold uppercase tracking-widest mb-3">
                        <span className="bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded">
                          {article.date ? new Date(article.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Recent"}
                        </span>
                        {article.author && (
                          <span className="text-muted-foreground font-medium normal-case tracking-normal truncate">by {article.author}</span>
                        )}
                      </div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors line-clamp-2 leading-tight">
                        {article.title}
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed line-clamp-3 flex-1 mb-4">
                        {article.content}
                      </p>
                      <div className="pt-4 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between">
                        <span className="text-xs font-semibold text-purple-600 dark:text-purple-400"></span>
                        <button
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const boldTitle = `*${article.title}*`;
                            const shareData = {
                              title: article.title,
                              text: `${boldTitle}\n\n${article.content || article.title}`,
                              url: `${window.location.origin}/articles/${article._id}`,
                            };
                            if (navigator.share) {
                              try { await navigator.share(shareData); }
                              catch (err) { if (err.name !== "AbortError") toast.error("Share failed"); }
                            } else {
                              navigator.clipboard.writeText(`*${article.title}*\n\n${article.content || ""}\n\n${window.location.origin}/articles/${article._id}`);
                              toast.success("Copied to clipboard!");
                            }
                          }}
                          className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                          title="Share this article"
                        >
                          <Share2 className="w-3 h-3" />
                          Share
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <div className="p-5 rounded-2xl bg-purple-100 dark:bg-purple-900/20 mb-4">
                  <Newspaper className="h-10 w-10 text-purple-500 opacity-60" />
                </div>
                <p className="text-base font-semibold text-purple-700 dark:text-purple-300 mb-1">No Articles Available</p>
                <p className="text-sm text-muted-foreground text-center max-w-xs">No articles have been published yet. Check back later!</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "UPDATES" && (
        <Card className="flex flex-col card-print-break mt-5 border-pink-100 dark:border-pink-900 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b mb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-pink-500" />
              Latest Updates
            </CardTitle>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {updates?.length || 0} Total Updates
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {updates && updates.length > 0 ? (
                updates.map((update, idx) => (
                  <UpdateCard key={update._id || idx} update={update} />
                ))
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <div className="p-5 rounded-2xl bg-pink-100 dark:bg-pink-900/20 mb-4">
                    <Megaphone className="h-10 w-10 text-pink-500 opacity-60" />
                  </div>
                  <p className="text-base font-semibold text-pink-700 dark:text-pink-300 mb-1">No Updates Available</p>
                  <p className="text-sm text-muted-foreground text-center max-w-xs">There are no institutional updates or news items at this time. Check back later!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
          </>
        )}
      <div className="fixed bottom-4 right-4 no-print">
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
      </div>
      </div>
    </div>
    
    <ProfileEditModal 
      user={currentUser} 
      open={isEditModalOpen} 
      onClose={() => setIsEditModalOpen(false)} 
      onSuccess={async () => {
        // 1. Optimistically update status to show 'Requested' immediately
        const now = new Date();
        setCurrentUser(prev => ({ 
          ...prev, 
          profileUpdateStatus: "Pending",
          profileRequestDate: now.toISOString()
        }));
        
        // 2. Invalidate React Query to update any visible tables immediately
        queryClient.invalidateQueries({ queryKey: ["users"] });
        
        // 3. Re-fetch full user data to ensure state is in sync with server
        try {
          const res = await fetch(`/api/users?_id=${currentUser._id}`, {
             headers: { "x-api-key": apiKey }
          });
          const data = await res.json();
          // The API returns { users: [...], pagination: ... }
          if (data && data.users && Array.isArray(data.users) && data.users.length > 0) {
            setCurrentUser(data.users[0]);
          } else if (data && Array.isArray(data) && data.length > 0) {
            setCurrentUser(data[0]);
          }
        } catch (error) {
          console.error("Error refreshing user data:", error);
        }

        // 4. Trigger router refresh for any server components
        router.refresh();
      }}
    />
  </>
  );
}
