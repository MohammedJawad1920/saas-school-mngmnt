"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export default function ProfileEditModal({ user, open, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    contactNumber: user?.contactNumber || "",
    alternativeNumber: user?.alternativeNumber || "",
    dateOfBirth: user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split("T")[0] : "",
    address: {
      houseName: user?.address?.houseName || user?.houseName || "",
      place: user?.address?.place || user?.place || "",
      locationPoint: user?.address?.locationPoint || user?.locationPoint || "",
      postOffice: user?.address?.postOffice || user?.postOffice || "",
      district: user?.address?.district || user?.district || "",
      state: user?.address?.state || user?.state || "",
      pin: user?.address?.pin || user?.pin || "",
    },
    studentSpecificField: {
      admissionNumber: user?.studentSpecificField?.admissionNumber || user?.admissionNumber || "",
      bloodGroup: user?.studentSpecificField?.bloodGroup || user?.bloodGroup || "",
      aadharNo: user?.studentSpecificField?.aadharNo || user?.aadharNo || "",
      guardianName: user?.studentSpecificField?.guardianName || user?.guardianName || "",
      guardianContactNumber: user?.studentSpecificField?.guardianContactNumber || user?.guardianContactNumber || "",
      guardianAlternativeNumber: user?.studentSpecificField?.guardianAlternativeNumber || user?.guardianAlternativeNumber || "",
      relationship: user?.studentSpecificField?.relationship || user?.relationship || "",
      islamicQualification: user?.studentSpecificField?.islamicQualification || user?.islamicQualification || "",
      academicQualification: user?.studentSpecificField?.academicQualification || user?.academicQualification || "",
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectChange = (name, value) => {
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const capitalizeData = (data) => {
      if (!data) return data;
      const result = Array.isArray(data) ? [] : {};
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          const value = data[key];
          if (typeof value === "object" && value !== null) {
            result[key] = capitalizeData(value);
          } else if (typeof value === "string" && key !== "email" && key !== "dateOfBirth") {
            result[key] = value.toUpperCase();
          } else {
            result[key] = value;
          }
        }
      }
      return result;
    };

    const transformedData = capitalizeData(formData);

    try {
      const response = await fetch("/api/users/profile-request", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user._id,
          pendingChanges: transformedData
        })
      });

      if (response.ok) {
        toast.success("Profile update request submitted for approval");
        if (onSuccess) onSuccess();
        onClose();
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to submit request");
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            Edit Profile Request
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8 py-4">
          {/* Personal Details Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-1 text-primary">Personal Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input id="dateOfBirth" name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label>Blood Group</Label>
                <Select value={formData.studentSpecificField.bloodGroup} onValueChange={(v) => handleSelectChange("studentSpecificField.bloodGroup", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Blood Group" />
                  </SelectTrigger>
                  <SelectContent>
                    {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map(bg => (
                      <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="aadharNo">Aadhar Number</Label>
                <Input id="aadharNo" name="studentSpecificField.aadharNo" value={formData.studentSpecificField.aadharNo} onChange={handleChange} maxLength={12} />
              </div>
            </div>
          </div>

          {/* Contact Details Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-1 text-primary">Contact Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactNumber">Contact Number</Label>
                <Input id="contactNumber" name="contactNumber" value={formData.contactNumber} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alternativeNumber">Alternative Number</Label>
                <Input id="alternativeNumber" name="alternativeNumber" value={formData.alternativeNumber} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guardianName">Guardian Name</Label>
                <Input id="guardianName" name="studentSpecificField.guardianName" value={formData.studentSpecificField.guardianName} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="relationship">Guardian Relationship</Label>
                <Input id="relationship" name="studentSpecificField.relationship" value={formData.studentSpecificField.relationship} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guardianContactNumber">Guardian Contact Number</Label>
                <Input id="guardianContactNumber" name="studentSpecificField.guardianContactNumber" value={formData.studentSpecificField.guardianContactNumber} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guardianAlternativeNumber">Guardian Alternative Number</Label>
                <Input id="guardianAlternativeNumber" name="studentSpecificField.guardianAlternativeNumber" value={formData.studentSpecificField.guardianAlternativeNumber} onChange={handleChange} />
              </div>
            </div>
          </div>

          {/* Address Details Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-1 text-primary">Address Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="houseName">House Name</Label>
                <Input id="houseName" name="address.houseName" value={formData.address.houseName} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="place">Place</Label>
                <Input id="place" name="address.place" value={formData.address.place} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="locationPoint">Location Point</Label>
                <Input id="locationPoint" name="address.locationPoint" value={formData.address.locationPoint} onChange={handleChange} placeholder="e.g., Near Mosque" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postOffice">Post Office</Label>
                <Input id="postOffice" name="address.postOffice" value={formData.address.postOffice} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="district">District</Label>
                <Input id="district" name="address.district" value={formData.address.district} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" name="address.state" value={formData.address.state} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pin">PIN Code</Label>
                <Input id="pin" name="address.pin" value={formData.address.pin} onChange={handleChange} maxLength={6} />
              </div>
            </div>
          </div>

          {/* Academic Details Section - Only shown for graduated students */}
          {(user?.studentSpecificField?.status === "Graduated" || user?.status === "Graduated") && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-1 text-primary">Academic Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Admission Number removed as per request */}
                <div className="space-y-2">
                  <Label htmlFor="islamicQualification">Islamic Qualification</Label>
                  <Input 
                    id="islamicQualification" 
                    name="studentSpecificField.islamicQualification" 
                    value={formData.studentSpecificField.islamicQualification} 
                    onChange={handleChange} 
                    placeholder="Enter islamic qualification"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="academicQualification">Academic Qualification</Label>
                  <Input 
                    id="academicQualification" 
                    name="studentSpecificField.academicQualification" 
                    value={formData.studentSpecificField.academicQualification} 
                    onChange={handleChange} 
                    placeholder="Enter academic qualification"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-6">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
