"use client";

import React, { forwardRef } from "react";
import Barcode from "react-barcode";

const BarcodeSheet = forwardRef(({ books = [] }, ref) => {
    return (
        <div ref={ref} className="p-4 bg-white text-black hidden print:block">
            <div className="grid grid-cols-5 gap-1">
                {books.map((book) => (
                    <div
                        key={book._id}
                        className="border p-1 flex flex-col items-center justify-center space-y-0.5 break-inside-avoid h-[2.1cm]"
                    >
                        <div className="text-[11px] font-bold uppercase tracking-wider">
                            {book.number}
                        </div>
                        <div className="flex justify-center bg-white p-1">
                            {book.number && /^[\x20-\x7E]+$/.test(String(book.number)) ? (
                                <Barcode
                                    value={String(book.number)}
                                    width={1.0}
                                    height={40}
                                    fontSize={10}
                                    margin={0}
                                    displayValue={false}
                                />
                            ) : (
                                <span className="text-xs text-muted-foreground py-2">Invalid Barcode</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

BarcodeSheet.displayName = "BarcodeSheet";

export default BarcodeSheet;
