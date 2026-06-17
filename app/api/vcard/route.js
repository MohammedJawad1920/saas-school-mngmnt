export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name") || "Contact";
    const phone = searchParams.get("phone") || "";
    const altPhone = searchParams.get("altPhone") || "";

    let vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nTEL;TYPE=CELL:${phone}\n`;
    if (altPhone) {
        vcard += `TEL;TYPE=HOME:${altPhone}\n`;
    }
    vcard += `END:VCARD`;
    return new Response(vcard, {
        headers: {
            "Content-Type": "text/x-vcard",
            "Content-Disposition": `attachment; filename="${name}.vcf"`,
        },
    });
}
