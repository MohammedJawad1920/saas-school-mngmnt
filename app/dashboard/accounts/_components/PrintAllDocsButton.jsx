"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
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

export default function PrintAllDocsButton({ transactions = [], apiKey }) {
    const [institution, setInstitution] = useState({});
    const { useFetchItems } = useCrud("settings", apiKey);
    const fetchSettingsQuery = useFetchItems(0, 0, {}, { enabled: !!apiKey });

    useEffect(() => {
        if (fetchSettingsQuery.data?.settings?.institution) {
            setInstitution(fetchSettingsQuery.data.settings.institution);
        }
    }, [fetchSettingsQuery.data]);

    const handlePrint = () => {
        if (!transactions || transactions.length === 0) {
            alert("No transactions to print.");
            return;
        }

        const institutionName = institution.name || "INSTITUTION NAME";
        const institutionTagline = institution.tagline || "";
        const institutionAddress = institution.address || "";
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

        let allHtml = "";

        transactions.forEach((transaction, index) => {
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

            let printContents = "";
            const institutionPhoto = institution.institutionPhoto?.url || null;

            if (transaction.type === "Income") {
                // Receipt HTML
                printContents = `
                    <div style="border: 2.5px solid #333; max-width: 680px; margin: 0 auto; font-family: 'Montserrat', Arial, sans-serif; background: #F7F7F7; position: relative;">
                        ${institutionPhoto ? '<div class="bg-logo" style="position: absolute; inset: 0; opacity: 0.1; background-image: url(' + institutionPhoto + '); background-size: cover; background-position: center; background-repeat: no-repeat; z-index: 0;"></div>' : ""}
                        <div style="position: relative; z-index: 1;">
                            <div style="display: flex; align-items: center; gap: 14px; padding: 10px 16px;">
                                <div style="flex: 1; text-align: center;">
                                    <div class="colored-green" style="font-size: 23px; font-weight: 900; letter-spacing: 0.5px; line-height: 1.2; color: #16a34a;">
                                        ${institutionName}
                                    </div>
                                    ${institutionTagline ? '<div class="colored-darkblue" style="font-size: 14px; font-weight: bold; color: #1e3a8a;">' + institutionTagline + '</div>' : ""}
                                    ${institutionAddress ? '<div class="colored-darkblue" style="font-size: 12px; color: #1e3a8a; margin-top: 2px;">' + institutionAddress + '</div>' : ""}
                                    ${contactLine ? '<div class="colored-darkblue" style="font-size: 11px; color: #1e3a8a;">' + contactLine + '</div>' : ""}
                                </div>
                            </div>

                            <div style="text-align: center; padding: 4px 0; border-top: 1.5px solid #333; font-weight: bold; font-size: 16px; letter-spacing: 2px; color: #000;">
                                RECEIPT
                            </div>

                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 14px;">
                                <span class="colored-red" style="font-weight: bold; font-size: 16px; color: #dc2626;">
                                    Nō&nbsp;<span style="font-size: 20px; color: #000;">${transaction.invoiceNo || ""}</span>
                                </span>
                                <span class="colored-red" style="font-size: 14px; font-style: italic; color: #dc2626;">
                                    Date:&nbsp;<span style="font-style: normal; color: #000;">${date}</span>
                                </span>
                            </div>

                            <div style="padding-top: 10px; padding-bottom: 4px;">
                                <div style="display: flex; align-items: flex-start; gap: 6px; margin-bottom: 0; padding-left: 16px; padding-right: 16px;">
                                    <span class="colored-blue" style="font-size: 14px; white-space: nowrap; flex-shrink: 0; padding-top: 2px; color: #2563eb;">Received with thanks from</span>
                                    <span style="flex: 1; font-size: 15px; font-weight: 600; min-height: 18px; color: #000;">${transaction.recipient || ""}</span>
                                </div>
                                <div style="display: flex; margin-bottom: 6px;">
                                    <span style="flex-shrink: 0; padding-left: 16px; font-size: 14px; visibility: hidden; white-space: nowrap;">Received with thanks from</span>
                                    <span style="width: 6px; flex-shrink: 0;"></span>
                                    <span style="flex: 1; overflow: hidden; white-space: nowrap; color: #bbb; letter-spacing: 4px; font-size: 12px;">${".".repeat(150)}</span>
                                </div>

                                <div style="display: flex; align-items: flex-start; gap: 6px; margin-bottom: 0; padding-left: 16px; padding-right: 16px;">
                                    <span class="colored-blue" style="font-size: 16px; white-space: nowrap; flex-shrink: 0; padding-top: 2px; color: #2563eb;">a sum of Rupees</span>
                                    <span style="flex: 1; font-size: 17px; font-weight: 600; min-height: 18px; color: #000;">${amountInWords}</span>
                                </div>
                                <div style="display: flex; margin-bottom: 6px;">
                                    <span style="flex-shrink: 0; padding-left: 16px; font-size: 14px; visibility: hidden; white-space: nowrap;">a sum of Rupees</span>
                                    <span style="width: 6px; flex-shrink: 0;"></span>
                                    <span style="flex: 1; overflow: hidden; white-space: nowrap; color: #bbb; letter-spacing: 4px; font-size: 12px;">${".".repeat(150)}</span>
                                </div>

                                <div style="display: flex; align-items: flex-start; gap: 6px; margin-bottom: 0; padding-left: 16px; padding-right: 16px;">
                                    <span class="colored-blue" style="font-size: 16px; white-space: nowrap; flex-shrink: 0; padding-top: 2px; color: #2563eb;">being</span>
                                    <span style="flex: 1; font-size: 17px; font-weight: 600; min-height: 18px; color: #000;">${transaction.item || transaction.category || ""}</span>
                                </div>
                                <div style="display: flex; margin-bottom: 10px;">
                                    <span style="flex-shrink: 0; padding-left: 16px; font-size: 14px; visibility: hidden; white-space: nowrap;">being</span>
                                    <span style="width: 6px; flex-shrink: 0;"></span>
                                    <span style="flex: 1; overflow: hidden; white-space: nowrap; color: #bbb; letter-spacing: 4px; font-size: 12px;">${".".repeat(150)}</span>
                                </div>

                                <div style="display: flex; align-items: center; gap: 10px; padding-left: 16px; padding-right: 16px;">
                                    <span style="font-size: 24px; font-weight: bold; color: #000;">₹</span>
                                    <div style="border: 2px solid #333; padding: 4px 18px; min-width: 110px; text-align: center; font-size: 18px; font-weight: bold; color: #000;">
                                        ${rupees.toLocaleString("en-IN")}${paise > 0 ? `.${String(paise).padStart(2, "0")}` : ""}
                                    </div>
                                </div>
                            </div>

                            <div style="display: flex; align-items: flex-end; justify-content: space-between; padding: 0 16px 16px; margin-top: 25px; position: relative; z-index: 10;">
                                <span class="payee-signature colored-blue" style="visibility: hidden; font-size: 13px; font-weight: bold; flex: 1; text-align: left; color: #2563eb;">Payee</span>
                                <span class="colored-blue" style="font-size: 13px; font-weight: bold; flex: 1; text-align: center; color: #2563eb;">Receiver</span>
                                <span class="colored-blue" style="font-size: 13px; font-weight: bold; flex: 1; text-align: right; color: #2563eb;">Secretary</span>
                            </div>
                        </div>
                    </div>
                `;

                let copyPrintContents = printContents.replace(/>\s*RECEIPT\s*<\/div>/, ">RECEIPT-COPY</div>");

                let wrapperHtml = `
                    <div class="receipt-wrapper" style="margin-bottom: 20px;">
                        <div style="max-width: 680px; margin: 0 auto 5px; text-align: right; font-size: 12px; font-weight: bold; color: #555;">Office Copy</div>
                        ${printContents}
                    </div>
                    <div style="border-top: 1px dashed #999; margin: 20px auto; max-width: 680px;"></div>
                    <div class="receipt-wrapper bw-copy" style="margin-bottom: 20px;">
                        <div style="max-width: 680px; margin: 0 auto 5px; text-align: right; font-size: 12px; font-weight: bold; color: #555;">RECEIPT-COPY</div>
                        ${copyPrintContents}
                    </div>
                `;

                const isOdd = index % 2 !== 0;
                const isLast = index === transactions.length - 1;

                allHtml += wrapperHtml;

                if (isOdd && !isLast) {
                    allHtml += `<div style="page-break-after: always;"></div>`;
                } else if (!isOdd && !isLast) {
                    allHtml += `<div style="border-top: 1px dashed #999; margin: 20px auto; max-width: 680px;"></div>`;
                }
            } else {
                // Voucher HTML
                const particulars = transaction.item || transaction.category || "";
                
                printContents = `
                    <div style="border: 2.5px solid #333; max-width: 680px; margin: 0 auto; font-family: 'Montserrat', Arial, sans-serif; background: #fff;">
                        <div style="display: flex; align-items: center; gap: 14px; padding: 10px 16px; border-bottom: 1.5px solid #333;">
                            <div style="flex: 1; text-align: center;">
                                <div style="font-size: 20px; font-weight: 900; letter-spacing: 0.5px; line-height: 1.2; color: #111;">
                                    ${institutionName}
                                </div>
                                ${institutionTagline ? `<div style="font-size: 12px; font-weight: bold; color: #333;">${institutionTagline}</div>` : ""}
                                ${institutionAddress ? `<div style="font-size: 9.5px; color: #444; margin-top: 2px;">${institutionAddress}</div>` : ""}
                                ${contactLine ? `<div style="font-size: 9px; color: #444;">${contactLine}</div>` : ""}
                            </div>
                        </div>

                        <div style="text-align: center; padding: 5px 0; border-top: 1.5px solid #333; font-weight: bold; font-size: 14px; letter-spacing: 2px; background: #f9f9f9;">
                            PAYMENT VOUCHER
                        </div>

                        <div style="display: flex; gap: 6px; padding: 6px 12px; font-size: 12px; align-items: flex-end;">
                            <span>L/F A/c</span>
                            <span style="flex: 1; border-bottom: 1px dotted #666;"></span>
                            
                            <span style="flex-shrink: 0; margin-left: 8px;">Vr. No.</span>
                            <span style="min-width: 80px; border-bottom: 1px dotted #666; padding-left: 4px; text-align: center; font-weight: bold;">
                                ${transaction.invoiceNo || ""}
                            </span>
                            
                            <span style="flex: 1; border-bottom: 1px dotted #666;"></span>

                            <span style="flex-shrink: 0; margin-left: 8px;">Date</span>
                            <span style="min-width: 90px; border-bottom: 1px dotted #666; padding-left: 4px; text-align: center; font-weight: bold;">
                                ${date}
                            </span>
                        </div>

                        <div style="display: flex; gap: 6px; padding: 5px 12px; border-bottom: 1.5px solid #333; font-size: 12px;">
                            <span>Name</span>
                            <span style="flex: 1; border-bottom: 1px dotted #666; padding-left: 4px; font-weight: bold;">
                                ${transaction.recipient || ""}
                            </span>
                        </div>

                        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                            <thead>
                                <tr>
                                    <th style="border: 1px solid #333; padding: 4px 6px; width: 50px; text-align: center;">Sl. No.</th>
                                    <th style="border: 1px solid #333; padding: 4px 6px; text-align: center;">Particulars</th>
                                    <th style="border: 1px solid #333; padding: 4px 6px; width: 100px; text-align: center;">Rs.</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr style="height: 30px;">
                                    <td style="border-left: 1px solid #333; border-right: 1px solid #333; padding: 4px 6px; text-align: center; font-weight: bold;">1</td>
                                    <td style="border-left: 1px solid #333; border-right: 1px solid #333; padding: 4px 8px; font-weight: bold;">${particulars}</td>
                                    <td style="border-left: 1px solid #333; border-right: 1px solid #333; padding: 4px 6px; text-align: center; font-weight: bold;">
                                        ${rupees !== "" ? rupees.toLocaleString("en-IN") : ""}
                                        ${paise > 0 ? `.${String(paise).padStart(2, "0")}` : ""}
                                    </td>
                                </tr>
                                <tr style="height: 30px;">
                                    <td style="border-left: 1px solid #333; border-right: 1px solid #333; padding: 4px 6px;"></td>
                                    <td style="border-left: 1px solid #333; border-right: 1px solid #333; padding: 4px 8px;"></td>
                                    <td style="border-left: 1px solid #333; border-right: 1px solid #333; padding: 4px 6px;"></td>
                                </tr>
                                <tr style="height: 30px;">
                                    <td style="border-left: 1px solid #333; border-right: 1px solid #333; padding: 4px 6px;"></td>
                                    <td style="border-left: 1px solid #333; border-right: 1px solid #333; padding: 4px 8px;"></td>
                                    <td style="border-left: 1px solid #333; border-right: 1px solid #333; padding: 4px 6px;"></td>
                                </tr>
                                <tr style="height: 30px;">
                                    <td style="border-left: 1px solid #333; border-right: 1px solid #333; padding: 4px 6px;"></td>
                                    <td style="border-left: 1px solid #333; border-right: 1px solid #333; padding: 4px 8px;"></td>
                                    <td style="border-left: 1px solid #333; border-right: 1px solid #333; padding: 4px 6px;"></td>
                                </tr>
                                <tr>
                                    <td colspan="2" style="border-left: 1px solid #333; border-right: 1px solid #333; border-top: 1px solid #333; padding: 5px 8px; text-align: right; font-weight: bold;">TOTAL</td>
                                    <td style="border-left: 1px solid #333; border-right: 1px solid #333; border-top: 1px solid #333; border-bottom: 1px solid #333; padding: 5px 6px; text-align: center; font-weight: bold;">${amountFormatted}</td>
                                </tr>
                                <tr>
                                    <td colspan="3" style="border-left: 1px solid #333; border-right: 1px solid #333; padding: 5px 8px 10px;">
                                        <div style="display: flex; gap: 6px; align-items: center;">
                                            <span style="font-weight: bold; white-space: nowrap;">Rupees</span>
                                            <span style="flex: 1; border-bottom: 1px dotted #666; padding-left: 4px; font-size: 13px; font-weight: bold;">${amountInWords}</span>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <div style="display: flex; justify-content: space-between; padding: 10px 20px 8px; font-size: 12px;">
                            <span>Secretary</span>
                            <span>Cashier</span>
                            <span>Signature of Receipient</span>
                        </div>
                    </div>
                `;

                let wrapperHtml = `
                    <div class="receipt-wrapper" style="margin-bottom: 20px;">
                        ${printContents}
                    </div>
                `;

                const isOdd = index % 2 !== 0;
                const isLast = index === transactions.length - 1;

                allHtml += wrapperHtml;

                if (isOdd && !isLast) {
                    allHtml += `<div style="page-break-after: always;"></div>`;
                } else if (!isOdd && !isLast) {
                    allHtml += `<div style="border-top: 1px dashed #999; margin: 20px auto; max-width: 680px;"></div>`;
                }
            }
        });

        const printWindow = window.open("", "_blank", "width=900,height=600");
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Print All Documents</title>
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
                    @media print { 
                        body { margin: 0; } 
                        .receipt-wrapper { page-break-inside: avoid; }
                    }
                    img { max-width: 100%; }
                    /* Restore original colors for the copy */
                    .bw-copy .colored-green { color: #111 !important; }
                    .bw-copy .colored-darkblue { color: #333 !important; }
                    .bw-copy .colored-blue { color: inherit !important; }
                    .bw-copy .colored-red { color: inherit !important; }
                    .bw-copy .bg-logo { display: none !important; }
                    .bw-copy .payee-signature { visibility: visible !important; }
                </style>
            </head>
            <body>
                ${allHtml}
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 600);
    };

    return (
        <Button onClick={handlePrint} variant="outline" className="gap-2 bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100">
            <Printer className="h-4 w-4" /> Print All
        </Button>
    );
}
