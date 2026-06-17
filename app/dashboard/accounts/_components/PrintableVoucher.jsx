"use client";

import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import useCrud from "@/hooks/use-crud";

function numberToWords(num) {
    if (!num && num !== 0) return "";
    const a = [
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
        "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
        "Seventeen", "Eighteen", "Nineteen",
    ];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    function toWords(n) {
        if (n < 20) return a[n];
        if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
        if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + toWords(n % 100) : "");
        if (n < 100000) return toWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + toWords(n % 1000) : "");
        if (n < 10000000) return toWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + toWords(n % 100000) : "");
        return toWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + toWords(n % 10000000) : "");
    }

    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);
    let result = toWords(rupees) + " Rupees";
    if (paise > 0) result += " and " + toWords(paise) + " Paise";
    return result + " Only";
}

export default function PrintableVoucher({ transaction, open, onClose, apiKey }) {
    const printRef = useRef(null);
    const [institution, setInstitution] = useState({});

    const { useFetchItems } = useCrud("settings", apiKey);
    const fetchSettingsQuery = useFetchItems(0, 0, {}, { enabled: !!apiKey && open });

    useEffect(() => {
        if (fetchSettingsQuery.data?.settings?.institution) {
            setInstitution(fetchSettingsQuery.data.settings.institution);
        }
    }, [fetchSettingsQuery.data]);

    if (!transaction) return null;

    const date = transaction.date
        ? new Date(transaction.date).toLocaleDateString("en-GB", {
            day: "2-digit", month: "2-digit", year: "numeric",
        })
        : "";

    const amountInWords = numberToWords(Number(transaction.amount) || 0);
    const rupees = Math.floor(Number(transaction.amount) || 0);
    const paise = Math.round(((Number(transaction.amount) || 0) - rupees) * 100);
    const amountFormatted =
        rupees.toLocaleString("en-IN") +
        (paise > 0 ? `.${String(paise).padStart(2, "0")}` : "");

    const institutionName = institution.name || "INSTITUTION NAME";
    const institutionTagline = institution.tagline || "";
    const institutionAddress = institution.address || "";
    const institutionLogo = institution.logo?.url || null;
    const primaryPhone = institution.contact?.primaryPhone || "";
    const secondaryPhone = institution.contact?.secondaryPhone || "";
    const email = institution.contact?.email || "";
    const website = institution.contact?.website || "";

    const phoneStr = [primaryPhone, secondaryPhone].filter(Boolean).join(", ");
    const contactLine = [
        phoneStr ? `Tel: ${phoneStr}` : "",
        email ? `Email: ${email}` : "",
        website ? website : "",
    ].filter(Boolean).join("  |  ");

    const tableRows = [
        { slNo: 1, particulars: transaction.item || transaction.category || "", rs: rupees, ps: paise },
        { slNo: "", particulars: "", rs: "", ps: "" },
        { slNo: "", particulars: "", rs: "", ps: "" },
        { slNo: "", particulars: "", rs: "", ps: "" },
    ];

    const handlePrint = () => {
        const printContents = printRef.current.innerHTML;
        const printWindow = window.open("", "_blank", "width=900,height=600");
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Payment Voucher No. ${transaction.invoiceNo || ""}</title>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;900&display=swap" rel="stylesheet">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: 'Montserrat', Arial, sans-serif; 
                        background: white; 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important;
                    }
                    @page { size: auto; margin: 10mm; }
                    @media print { body { margin: 0; } }
                    img { max-width: 100%; }
                </style>
            </head>
            <body>${printContents}</body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 600);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl p-0 overflow-auto">
                <DialogTitle className="sr-only">Voucher Preview</DialogTitle>

                <div className="flex items-center justify-between p-3 border-b bg-gray-50 print:hidden">
                    <span className="font-semibold text-gray-700">
                        Payment Voucher — No.&nbsp;{transaction.invoiceNo}
                    </span>
                    <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                        <Printer className="h-4 w-4" /> Print Voucher
                    </Button>
                </div>

                <div className="p-4 bg-white" ref={printRef}>
                    <div style={{
                        border: "2.5px solid #333",
                        maxWidth: 680,
                        margin: "0 auto",
                        fontFamily: "'Montserrat', Arial, sans-serif",
                        background: "#fff",
                    }}>
                        {/* ── INSTITUTION HEADER ── */}
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                            padding: "10px 16px",
                            borderBottom: "1.5px solid #333",
                        }}>
                            {/* Logo removed as requested */}
                            {/* Name + tagline + address */}
                            <div style={{ flex: 1, textAlign: "center" }}>
                                <div style={{
                                    fontSize: 20, fontWeight: 900,
                                    fontFamily: "'Montserrat', Arial, sans-serif",
                                    letterSpacing: 0.5, lineHeight: 1.2,
                                    color: "#111",
                                }}>
                                    {institutionName}
                                </div>
                                {institutionTagline && (
                                    <div style={{ fontSize: 12, fontWeight: "bold", color: "#333", fontFamily: "'Montserrat', Arial, sans-serif" }}>
                                        {institutionTagline}
                                    </div>
                                )}
                                {institutionAddress && (
                                    <div style={{ fontSize: 9.5, color: "#444", fontFamily: "'Montserrat', Arial, sans-serif", marginTop: 2 }}>
                                        {institutionAddress}
                                    </div>
                                )}
                                {contactLine && (
                                    <div style={{ fontSize: 9, color: "#444", fontFamily: "'Montserrat', Arial, sans-serif" }}>
                                        {contactLine}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── PAYMENT VOUCHER TITLE ── */}
                        <div style={{
                            textAlign: "center",
                            padding: "5px 0",
                            borderTop: "1.5px solid #333",
                            fontWeight: "bold",
                            fontFamily: "'Montserrat', Arial, sans-serif",
                            fontSize: 14,
                            letterSpacing: 2,
                            background: "#f9f9f9",
                        }}>
                            PAYMENT VOUCHER
                        </div>

                        {/* ── L/F A/c, Vr. No., Date ── */}
                        <div style={{
                            display: "flex", gap: 6, padding: "6px 12px",
                            fontFamily: "'Montserrat', Arial, sans-serif", fontSize: 12,
                            alignItems: "flex-end",
                        }}>
                            <span>L/F A/c</span>
                            <span style={{ flex: 1, borderBottom: "1px dotted #666" }} />
                            
                            <span style={{ flexShrink: 0, marginLeft: 8 }}>Vr. No.</span>
                            <span style={{ minWidth: 80, borderBottom: "1px dotted #666", paddingLeft: 4, textAlign: "center", fontWeight: "bold" }}>
                                {transaction.invoiceNo}
                            </span>
                            
                            <span style={{ flex: 1, borderBottom: "1px dotted #666" }} />

                            <span style={{ flexShrink: 0, marginLeft: 8 }}>Date</span>
                            <span style={{ minWidth: 90, borderBottom: "1px dotted #666", paddingLeft: 4, textAlign: "center", fontWeight: "bold" }}>
                                {date}
                            </span>
                        </div>

                        {/* ── NAME ── */}
                        <div style={{
                            display: "flex", gap: 6, padding: "5px 12px",
                            borderBottom: "1.5px solid #333",
                            fontFamily: "'Montserrat', Arial, sans-serif", fontSize: 12,
                        }}>
                            <span>Name</span>
                            <span style={{ flex: 1, borderBottom: "1px dotted #666", paddingLeft: 4, fontWeight: "bold" }}>
                                {transaction.recipient || ""}
                            </span>
                        </div>

                        {/* ── TABLE ── */}
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'Montserrat', Arial, sans-serif" }}>
                            <thead>
                                <tr>
                                    <th style={{ border: "1px solid #333", padding: "4px 6px", width: 50, textAlign: "center" }}>Sl. No.</th>
                                    <th style={{ border: "1px solid #333", padding: "4px 6px", textAlign: "center" }}>Particulars</th>
                                    <th style={{ border: "1px solid #333", padding: "4px 6px", width: 100, textAlign: "center" }}>Rs.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tableRows.map((row, idx) => (
                                    <tr key={idx} style={{ height: 30 }}>
                                        <td style={{ borderLeft: "1px solid #333", borderRight: "1px solid #333", padding: "4px 6px", textAlign: "center", fontWeight: "bold" }}>{row.slNo}</td>
                                        <td style={{ borderLeft: "1px solid #333", borderRight: "1px solid #333", padding: "4px 8px", fontWeight: "bold" }}>{row.particulars}</td>
                                        <td style={{ borderLeft: "1px solid #333", borderRight: "1px solid #333", padding: "4px 6px", textAlign: "center", fontWeight: "bold" }}>
                                            {idx === 0 && row.rs !== "" ? row.rs.toLocaleString("en-IN") : ""}
                                            {idx === 0 && row.ps > 0 ? `.${String(row.ps).padStart(2, "0")}` : ""}
                                        </td>
                                    </tr>
                                ))}

                                {/* Total row */}
                                <tr>
                                    <td colSpan={2} style={{ borderLeft: "1px solid #333", borderRight: "1px solid #333", borderTop: "1px solid #333", padding: "5px 8px", textAlign: "right", fontWeight: "bold" }}>
                                        TOTAL
                                    </td>
                                    <td style={{ borderLeft: "1px solid #333", borderRight: "1px solid #333", borderTop: "1px solid #333", borderBottom: "1px solid #333", padding: "5px 6px", textAlign: "center", fontWeight: "bold" }}>
                                        {amountFormatted}
                                    </td>
                                </tr>
                                {/* Rupees row */}
                                <tr>
                                    <td colSpan={3} style={{ borderLeft: "1px solid #333", borderRight: "1px solid #333", padding: "5px 8px 10px" }}>
                                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                            <span style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>Rupees</span>
                                            <span style={{ flex: 1, borderBottom: "1px dotted #666", paddingLeft: 4, fontSize: 13, fontWeight: "bold" }}>
                                                {amountInWords}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>



                        {/* ── FOOTER SIGNATURES ── */}
                        <div style={{
                            display: "flex", justifyContent: "space-between",
                            padding: "10px 20px 8px",
                            fontFamily: "'Montserrat', Arial, sans-serif", fontSize: 12,
                        }}>
                            <span>Secretary</span>
                            <span>Cashier</span>
                            <span>Signature of Receipient</span>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
