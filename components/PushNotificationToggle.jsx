"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Function to convert VAPID key to Uint8Array
const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export default function PushNotificationToggle() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
      }
      registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error("Error checking push subscription:", error);
    }
  };

  const subscribe = async () => {
    setIsLoading(true);
    try {
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        console.log("No service worker found, attempting to register manually...");
        registration = await navigator.serviceWorker.register('/sw.js');
      }
      
      if (!registration) {
        throw new Error("Service Worker registration failed.");
      }
      
      // Instead of relying on the notoriously flaky .ready promise, we check if it's active manually
      if (!registration.active) {
        console.log("Waiting for service worker to activate...");
        // Wait up to 3 seconds for it to become active
        for (let i = 0; i < 15; i++) {
          await new Promise(resolve => setTimeout(resolve, 200));
          registration = await navigator.serviceWorker.getRegistration();
          if (registration && registration.active) break;
        }
      }

      if (!registration || !registration.active) {
        throw new Error("Service worker is stuck in installation. Please try again or refresh the page.");
      }

      // Ask for permission explicitly
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Notification permission denied");
        setIsLoading(false);
        return;
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        toast.error("Push notifications not configured on the server");
        setIsLoading(false);
        return;
      }

      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });

      // Send the subscription to our API
      const response = await fetch("/api/user/push-subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(subscription),
      });

      if (response.ok) {
        setIsSubscribed(true);
        toast.success("Successfully subscribed to notifications!");
      } else {
        const errorData = await response.json();
        toast.error(`Server error: ${errorData.error || response.statusText}`);
        await subscription.unsubscribe();
      }
    } catch (error) {
      console.error("Error subscribing to push notifications:", error);
      toast.error(`Failed to subscribe: ${error.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      onClick={subscribe}
      disabled={isSubscribed || isLoading}
    >
      {isSubscribed ? (
        <>
          <Bell className="mr-2 h-4 w-4 text-green-500" />
          Notifications Enabled
        </>
      ) : (
        <>
          <BellOff className="mr-2 h-4 w-4" />
          {isLoading ? "Enabling..." : "Enable Alerts"}
        </>
      )}
    </Button>
  );
}
