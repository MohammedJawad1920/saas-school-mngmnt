import Link from "next/link";
import { cn } from "@/lib/utils";

export default function PublicHeader({ logo, name, leftLogo, centerLogo, rightLogo, rightName, centered = false }) {
  // If no logos are provided, show a minimalist header with just the name
  if (!logo && !rightLogo && !leftLogo && !centerLogo) {
    return (
      <header className="w-full py-2 px-6 shadow bg-white/80 backdrop-blur-md sticky top-0 z-50 min-h-[4rem] flex items-center">
        <div className={cn("max-w-7xl mx-auto w-full flex items-center", centered ? "justify-center" : "justify-between")}>
          <Link href="/" className="text-emerald-800 font-bold hover:text-emerald-600 transition-colors">
            {name || "Home"}
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="w-full py-2 px-6 shadow bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className={cn("max-w-7xl mx-auto flex items-center justify-between")}>
        {/* Left Logos */}
        <div className="flex items-center gap-4 md:gap-6 flex-1">
          {logo && (
            <Link href="/" className="flex items-center">
              <img
                src={logo}
                alt={`${name} Logo`}
                className="object-contain h-10 md:h-14 w-auto drop-shadow-sm transition-transform hover:scale-105"
              />
            </Link>
          )}
          
          {leftLogo && (
            <img
              src={leftLogo}
              alt="Secondary Logo"
              className="object-contain h-10 md:h-14 w-auto drop-shadow-sm"
            />
          )}

          {!logo && !leftLogo && (
             <Link href="/" className="text-emerald-800 font-bold hover:text-emerald-600 transition-colors">
               {name}
             </Link>
          )}
        </div>

        {/* Center Logo */}
        {centerLogo && (
          <div className="flex-1 flex justify-center">
            <img
              src={centerLogo}
              alt="Center Logo"
              className="object-contain h-8 md:h-12 w-auto drop-shadow-md"
            />
          </div>
        )}

        {/* Right Logo / Org Logo */}
        <div className="flex-1 flex justify-end">
          {!centered && rightLogo && (
            <div className="flex items-center">
              <img
                src={rightLogo}
                alt={rightName || "Organisation Logo"}
                className="object-contain h-10 md:h-14 w-auto drop-shadow-sm"
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
