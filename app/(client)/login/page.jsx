"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader, Mail, Eye, EyeOff } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [studentId, setStudentId] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [backgroundImage, setBackgroundImage] = useState("");
  const [settings, setSettings] = useState(null);
  const [showMobileNumber, setShowMobileNumber] = useState(false);
  const [otpSentSuccess, setOtpSentSuccess] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState({
    otp: "",
    student: ""
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await axios.get("/api/settings");
        const data = response.data.settings;
        setSettings(data);
        const photoUrl = data?.institution?.institutionPhoto?.url;
        if (photoUrl) {
          setBackgroundImage(photoUrl);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };
    fetchSettings();
  }, []);

  // Auto-redirect for OTP Sent
  useEffect(() => {
    if (otpSentSuccess) {
      const timer = setTimeout(() => {
        setOtpSentSuccess(false);
        router.push(`/otp?email=${encodeURIComponent(email)}`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [otpSentSuccess, email, router]);

  // Auto-redirect for Student Login Success
  useEffect(() => {
    if (loginSuccess) {
      const timer = setTimeout(() => {
        setLoginSuccess(false);
        router.push("/dashboard");
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [loginSuccess, router]);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setFormErrors(prev => ({ ...prev, otp: "" }));
    try {
      setLoading(true);
      await axios.post("/api/auth/sendOTP", { email });
      setOtpSentSuccess(true);
    } catch (error) {
      console.error("Error sending OTP:", error.message);
      setFormErrors(prev => ({
        ...prev,
        otp: error?.response?.data?.message || "Failed to send OTP. Please try again."
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleStudentLogin = async (e) => {
    e.preventDefault();
    setFormErrors(prev => ({ ...prev, student: "" }));
    try {
      setLoading(true);
      await axios.post("/api/auth/student-login", { studentId, mobileNumber });
      setLoginSuccess(true);
    } catch (error) {
      console.error("Error logging in:", error.message);
      setFormErrors(prev => ({
        ...prev,
        student: error?.response?.data?.message || "Failed to login. Please try again."
      }));
    } finally {
      setLoading(false);
    }
  };

  const institutionLogo = settings?.institution?.logo?.url;
  const institutionName = settings?.institution?.name;

  return (
    <div
      className="relative flex min-h-screen items-center justify-center p-4 bg-cover bg-center bg-no-repeat transition-all duration-1000 ease-in-out"
      style={
        backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : {}
      }
    >
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-1000 ${
          backgroundImage ? "opacity-100" : "opacity-0"
        }`}
      />
      <Card className="z-10 w-full max-w-md shadow-2xl bg-white/90 backdrop-blur-xl border-white/20 animate-in fade-in zoom-in duration-500">
        <CardHeader className="space-y-4 pb-2 text-center">
          {institutionLogo && (
            <div className="flex justify-center mb-2 animate-in slide-in-from-top duration-700 delay-200">
              <img
                src={institutionLogo}
                alt={institutionName || "Institution Logo"}
                className="h-20 w-auto object-contain drop-shadow-md"
              />
            </div>
          )}
          <div className="space-y-1">
            <CardTitle className="text-2xl font-black tracking-tight text-gray-900">
              {institutionName || "Sign In"}
            </CardTitle>
            <p className="text-sm text-gray-500 font-medium tracking-wide uppercase">
              Official Access Portal
            </p>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs defaultValue="otp" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="otp">OTP Login</TabsTrigger>
              <TabsTrigger value="student">Student Login</TabsTrigger>
            </TabsList>
            <TabsContent value="otp">
              <form onSubmit={handleSendOTP} className="space-y-4 pt-4">
                <div className="space-y-1">
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      required
                      autoFocus
                      className={`pl-10 ${formErrors.otp ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                {formErrors.otp && (
                  <p className="text-xs font-bold text-red-500 animate-in fade-in slide-in-from-top-1">
                    {formErrors.otp}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <Loader className="animate-spin mr-2" />
                  ) : (
                    "Send OTP"
                  )}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="student">
              <form onSubmit={handleStudentLogin} className="space-y-4 pt-4">
                <div className="space-y-1">
                  <Label>Student ID</Label>
                  <Input
                    type="text"
                    placeholder="Enter Student ID"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className={`uppercase ${formErrors.student ? "border-red-500" : ""}`}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Mobile Number</Label>
                  <div className="relative">
                    <Input
                      type={showMobileNumber ? "text" : "password"}
                      placeholder="Enter Mobile Number"
                      required
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      className={`pr-10 ${formErrors.student ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowMobileNumber(!showMobileNumber)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    >
                      {showMobileNumber ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>
                {formErrors.student && (
                  <p className="text-xs font-bold text-red-500 animate-in fade-in slide-in-from-top-1">
                    {formErrors.student}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader className="animate-spin mr-2" /> : "Login"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AlertDialog open={otpSentSuccess} onOpenChange={setOtpSentSuccess}>
        <AlertDialogContent className="max-w-sm rounded-2xl border-none shadow-2xl bg-white/95 backdrop-blur-xl">
          <AlertDialogHeader className="flex flex-col items-center text-center space-y-4">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center animate-in zoom-in duration-500">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <div className="space-y-2">
              <AlertDialogTitle className="text-2xl font-black text-gray-900">OTP Sent!</AlertDialogTitle>
              <AlertDialogDescription className="text-base font-medium text-gray-600">
                A verification code has been sent to <br />
                <span className="font-bold text-gray-800">{email}</span>.
                Please check your inbox.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-col gap-2 mt-2">
            <AlertDialogAction 
              onClick={() => {
                setOtpSentSuccess(false);
                router.push(`/otp?email=${encodeURIComponent(email)}`);
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-green-500/25"
            >
              Enter OTP Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={loginSuccess} onOpenChange={setLoginSuccess}>
        <AlertDialogContent className="max-w-sm rounded-2xl border-none shadow-2xl bg-white/95 backdrop-blur-xl">
          <AlertDialogHeader className="flex flex-col items-center text-center space-y-4">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center animate-in zoom-in duration-500">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <div className="space-y-2">
              <AlertDialogTitle className="text-2xl font-black text-gray-900">Login Successful!</AlertDialogTitle>
              <AlertDialogDescription className="text-base font-medium text-gray-600">
                Welcome back! Redirecting you to your dashboard...
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-col gap-2 mt-2">
            <AlertDialogAction 
              onClick={() => {
                setLoginSuccess(false);
                router.push("/dashboard");
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-blue-500/25"
            >
              Go to Dashboard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
