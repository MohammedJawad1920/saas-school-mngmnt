import "./globals.css";
import { Montserrat } from "next/font/google";
import Providers from "@/components/Providers";
import { Toaster } from "@/components/ui/sonner";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata = {
  title: "Sa-adiya Da-awa College - Islamic College Of Integrated Studies",
  description:
    "Sadiya Dawa College (Sa-adiya Da-awa College) offers comprehensive Islamic and integrated studies, promoting academic excellence and spiritual growth. Leading Islamic college for higher education and spiritual development.",
  authors: [{ name: "Jawad TS" }],
  keywords: [
    // Primary variations
    "Sadiya Dawa College",
    "Sa-adiya Da-awa College",
    "Saadiya Daawa College",
    "Sa adiya Da awa College",

    // Institution types
    "Islamic College",
    "Islamic College of Integrated Studies",
    "Integrated Studies College",
    "Islamic University",
    "Islamic Education Institution",

    // Location-based (add your actual location)
    "Islamic College Kerala",
    "Islamic College India",
    "Sadiya Dawa College Kerala",

    // Educational terms
    "Islamic Higher Education",
    "Islamic Studies Programs",
    "Da-awa Education",
    "Islamic Academic Excellence",
    "Spiritual Growth Education",
    "Islamic Integrated Learning",

    // Brand variations
    "Jamia Sa Adiya Arabia",
    "SCOFIST",
    "Sa-adiya College",
    "Dawa College",

    // Long-tail keywords
    "best islamic college integrated studies",
    "islamic education academic excellence",
    "sadiya dawa college admission",
    "islamic college spiritual growth",
    "integrated studies islamic education",

    // other
    "sadiya",
    "sa-adiya",
    "saadiya",
    "sa adiya",
    "daawa",
    "da awa",
    "da-awa",
    "college",
  ].join(", "),

  robots:
    "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",

  // Structured data for better search understanding
  alternates: {
    canonical: "https://www.scofist.com",
  },

  openGraph: {
    title: "Sadiya Dawa College | Islamic College for Integrated Studies",
    description:
      "Join Sadiya Dawa College (Sa-adiya Da-awa College), where Islamic and academic excellence meet. Premier Islamic institution offering comprehensive programs for intellectual and spiritual development.",
    url: "https://www.scofist.com",
    type: "website",
    locale: "en_US",
    siteName: "Sadiya Dawa College",
    images: [
      {
        url: "/logo.svg", //
        width: 1200,
        height: 630,
        alt: "Sadiya Dawa College - Islamic College of Integrated Studies",
      },
    ],
  },

  metadataBase: new URL("https://www.scofist.com"),

  // Additional structured data
  other: {
    "DC.title": "Sadiya Dawa College",
    "DC.description":
      "Islamic College of Integrated Studies offering comprehensive education",
    "DC.subject": "Islamic Education, Higher Education, Integrated Studies",
    "DC.language": "en",
    "geo.region": "IN-KL", // Kerala, India - adjust as needed
    "geo.placename": "Kasaragod",
    ICBM: "Your coordinates",
  },

  manifest: "/manifest.json",

  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sadiya Dawa College",
  },

  // Category for app stores
  category: "Education",
};

// Additional JSON-LD structured data for your pages
export const structuredData = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "Sadiya Dawa College",
  alternateName: [
    "Sa-adiya Da-awa College",
    "Saadiya Daawa College",
    "SCOFIST",
    "Islamic College of Integrated Studies",
  ],
  description:
    "Premier Islamic college offering integrated studies, academic excellence, and spiritual growth",
  url: "https://www.scofist.com",
  logo: "https://www.scofist.com/logo.svg",
  foundingDate: "2009",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Kasaragod",
    addressRegion: "Kerala",
    addressCountry: "IN",
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "8943264498",
    contactType: "customer service",
    email: "ksdjabbu@gmail.com",
  },
  sameAs: [
    "https://instagram.com/jawad_thuruthi",
    // Add other social media URLs
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={montserrat.className}>
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
