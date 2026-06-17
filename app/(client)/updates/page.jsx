import connectToDB from "@/lib/db";
import Update from "@/models/Update";
import Settings from "@/models/Settings";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import UpdateCard from "@/components/UpdateCard";
import { Calendar as CalendarIcon } from "lucide-react";

export const metadata = {
  title: "ORCHID Updates | Sadiya Dawa College",
  description: "Stay informed with the latest news, announcements, and updates from Sadiya Dawa College.",
};

export const dynamic = "force-dynamic";

async function getUpdates() {
  await connectToDB();
  const updates = await Update.find({}).sort({ date: -1 }).lean();
  return JSON.parse(JSON.stringify(updates));
}

async function getSettings() {
  await connectToDB();
  const settings = await Settings.findOne().lean();
  return JSON.parse(JSON.stringify(settings));
}

export default async function UpdatesPage() {
  const updates = await getUpdates();
  const settings = await getSettings();

  const institutionLogo = settings?.institution?.logo?.url;
  const updatesLogo = settings?.institution?.updatesLogo?.url;
  const orgLogo = settings?.org?.logo?.url;
  const institutionName = settings?.institution?.name || "Sadiya Dawa College";
  const orgName = settings?.org?.name || "Organisation";

  return (
    <div className="flex flex-col min-h-screen bg-gray-50/50">
      <PublicHeader 
        logo={null} 
        name={institutionName} 
        rightLogo={null}
        rightName={orgName}
        centered={true}
      />

      <main className="flex-1">
        {/* Hero Section - Super Slim with Balanced Logos */}
        <section className="bg-emerald-800 text-white py-1 px-6">
          <div className="max-w-7xl mx-auto flex flex-row items-center justify-between gap-4">
            {/* Institution Logo (Left) - Increased size */}
            <div className="flex-1 flex justify-start">
              {institutionLogo && (
                <img 
                  src={institutionLogo} 
                  alt={institutionName} 
                  className="h-14 md:h-24 w-auto object-contain drop-shadow-lg"
                />
              )}
            </div>

            {/* Main Updates Logo (Center) */}
            <div className="flex-[2] flex flex-col items-center">
              {updatesLogo && (
                <img 
                  src={updatesLogo} 
                  alt="ORCHID Logo" 
                  className="h-20 md:h-36 w-auto object-contain drop-shadow-2xl"
                />
              )}

            </div>

            {/* Organisation Logo (Right) - Increased size */}
            <div className="flex-1 flex justify-end">
              {orgLogo && (
                <img 
                  src={orgLogo} 
                  alt={orgName} 
                  className="h-14 md:h-24 w-auto object-contain drop-shadow-lg"
                />
              )}
            </div>
          </div>
        </section>

        {/* Updates List - Small Grid Cards */}
        <section className="max-w-7xl mx-auto py-12 px-6">
          {updates.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="bg-emerald-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarIcon className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">No updates yet</h2>
              <p className="text-gray-500 mt-2">Check back later for new announcements.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {updates.map((update) => (
                <UpdateCard key={update._id} update={update} />
              ))}
            </div>
          )}
        </section>
      </main>

      <PublicFooter settings={settings} institutionName={institutionName} />
    </div>
  );
}
