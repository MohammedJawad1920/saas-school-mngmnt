import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import { fetchData } from "@/lib/utils";
import { cookies } from "next/headers";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  try {
    const cookiesStore = await cookies();
    const activeRole = cookiesStore.get("active-role")?.value;
    const apiKey = process.env.API_KEY;

    const data = await fetchData("settings", "", 0);

    const general = {
      ...data.general,
    };

    const institution = {
      ...data.institution,
      ...data.institution.contact,
    };

    const festival = {
      festival_name: data.festival?.festivalInfo?.name || "",
      festival_theme: data.festival?.festivalInfo?.theme || "",
      festival_year:
        data.festival?.festivalInfo?.year || new Date().getFullYear(),
      festival_venue: data.festival?.festivalInfo?.venue || "",
      festival_startDate: data.festival?.festivalInfo?.dates?.startDate
        ? new Date(data.festival.festivalInfo.dates.startDate)
            .toISOString()
            .split("T")[0]
        : "",
      festival_endDate: data.festival?.festivalInfo?.dates?.endDate
        ? new Date(data.festival.festivalInfo.dates.endDate)
            .toISOString()
            .split("T")[0]
        : "",
      participantsCard: data.festival?.participantsCard?.backgroundImage || {},
      textColor: data.festival?.participantsCard?.textColor || "#000000",
      right: data.festival?.participantsCard?.textPositions?.right || 0,
      bottom: data.festival?.participantsCard?.textPositions?.bottom || 0,
      left: data.festival?.participantsCard?.textPositions?.left || 0,
      festivalNameImage: data.festival?.festivalNameImage || {},
      printHeader: data.festival?.printHeader || {},
      registrationDeadline: (() => {
        try {
          if (!data.festival?.registrationDeadline) return "";
          const date = new Date(data.festival.registrationDeadline);
          return isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
        } catch (e) {
          return "";
        }
      })(),
      instructions: data.festival?.instructions || "",
    };

    const idCard = {
      ...data.idCard,
    };

    const spark = {
      spark_name: data.spark?.name,
      spark_fullName: data.spark?.fullName,
      spark_tagline: data.spark?.tagline,
      spark_address: data.spark?.address,
      spark_primaryPhone: data.spark?.contact?.primaryPhone,
      spark_secondaryPhone: data.spark?.contact?.secondaryPhone,
      spark_email: data.spark?.contact?.email,
      spark_website: data.spark?.contact?.website,
      spark_logo: data.spark?.logo || {},
      committeePosters: data.spark?.committeePosters || [],
    };

    const org = {
      org_name: data.org?.name,
      org_fullName: data.org?.fullName,
      org_tagline: data.org?.tagline,
      org_address: data.org?.address,
      org_primaryPhone: data.org?.contact?.primaryPhone,
      org_secondaryPhone: data.org?.contact?.secondaryPhone,
      org_email: data.org?.contact?.email,
      org_website: data.org?.contact?.website,
      org_logo: data.org?.logo || {},
      committeePosters: data.org?.committeePosters || [],
    };

    return (
      <>
        <Header title="SETTINGS" subTitle="Customize System Behavior" />
        <SettingsClient
          activeRole={activeRole}
          apiKey={apiKey}
          general={general}
          institution={institution}
          festival={festival}
          idCard={idCard}
          spark={spark}
          org={org}
        />
      </>
    );
  } catch (error) {
    console.error("Error loading settings:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing your request."
      />
    );
  }
}

export const revalidate = 0;
