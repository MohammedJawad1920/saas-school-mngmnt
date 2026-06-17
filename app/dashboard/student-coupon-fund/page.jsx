import StudentCouponClient from "./StudentCouponClient";

export const metadata = {
  title: "Student Coupon Fund Management",
  description: "Manage student coupon funds and payments",
};

export default function StudentCouponPage() {
  const apiKey = process.env.API_KEY;

  return <StudentCouponClient apiKey={apiKey} />;
}
