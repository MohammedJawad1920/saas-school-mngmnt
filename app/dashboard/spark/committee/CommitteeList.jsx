
"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, Pencil, Trash2, X, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CldUploadWidget } from "next-cloudinary";

export default function CommitteeList({ initialMembers, isSparkAdmin }) {
    const [members, setMembers] = useState(initialMembers);
    const [isOpen, setIsOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [currentMember, setCurrentMember] = useState(null);
    const [loading, setLoading] = useState(false);
    // const { toast } = useToast(); -> Using sonner toast directly

    const [formData, setFormData] = useState({
        name: "",
        designation: "",
        place: "",
        photo: {},
        order: 0,
    });

    const resetForm = () => {
        setFormData({
            name: "",
            designation: "",
            place: "",
            photo: {},
            order: 0,
        });
        setCurrentMember(null);
        setIsEdit(false);
    };

    const handleOpenChange = (open) => {
        setIsOpen(open);
        if (!open) resetForm();
    };

    const handleEdit = (member) => {
        setFormData({
            name: member.name,
            designation: member.designation,
            place: member.place || "",
            photo: member.photo || {},
            order: member.order || 0,
        });
        setCurrentMember(member);
        setIsEdit(true);
        setIsOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this member?")) return;

        try {
            const res = await fetch(`/api/spark/committee?id=${id}`, {
                method: "DELETE",
            });
            const data = await res.json();

            if (res.ok) {
                setMembers(members.filter((m) => m._id !== id));
                toast("Success", { description: "Member deleted successfully" });
            } else {
                toast("Error", {
                    description: data.message || "Something went wrong",
                });
            }
        } catch (error) {
            toast("Error", {
                description: "Failed to delete member",
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = "/api/spark/committee";
            const method = isEdit ? "PUT" : "POST";
            const body = isEdit ? { ...formData, _id: currentMember._id } : formData;

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (res.ok) {
                if (isEdit) {
                    setMembers(
                        members.map((m) => (m._id === currentMember._id ? data.member : m))
                    );
                } else {
                    setMembers([...members, data.member]);
                }
                toast("Success", {
                    description: `Member ${isEdit ? "updated" : "added"} successfully`,
                });
                setIsOpen(false);
            } else {
            toast("Error", {
                description: data.message || "Failed to save member",
            });
        }
    } catch (error) {
        toast("Error", {
            description: "An unexpected error occurred",
        });
    } finally {
        setLoading(false);
    }
};

return (
    <div>
        {isSparkAdmin && (
            <div className="mb-6 flex justify-end">
                <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Add Member
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {isEdit ? "Edit Member" : "Add New Member"}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Photo</Label>
                                <CldUploadWidget
                                    uploadPreset="scofist_preset"
                                    onSuccess={(result) => {
                                        setFormData({
                                            ...formData,
                                            photo: {
                                                url: result.info.secure_url,
                                                publicId: result.info.public_id,
                                            },
                                        });
                                    }}
                                >
                                    {({ open }) => (
                                        <div
                                            onClick={() => open()}
                                            className="border-2 border-dashed rounded-md p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors h-40"
                                        >
                                            {formData.photo?.url ? (
                                                <div className="relative w-32 h-32">
                                                    <Image
                                                        src={formData.photo.url}
                                                        alt="Preview"
                                                        fill
                                                        className="object-cover rounded-md"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="text-muted-foreground text-sm">
                                                    Click to upload photo
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CldUploadWidget>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        required
                                        value={formData.name}
                                        onChange={(e) =>
                                            setFormData({ ...formData, name: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="designation">Designation</Label>
                                    <Input
                                        id="designation"
                                        required
                                        value={formData.designation}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                designation: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="place">Place</Label>
                                    <Input
                                        id="place"
                                        value={formData.place}
                                        onChange={(e) =>
                                            setFormData({ ...formData, place: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="order">Display Order</Label>
                                    <Input
                                        id="order"
                                        type="number"
                                        value={formData.order}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                order: parseInt(e.target.value),
                                            })
                                        }
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={loading}>
                                    {loading ? "Saving..." : "Save"}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {members.map((member) => (
                <Card key={member._id} className="text-center overflow-hidden group">
                    <CardContent className="p-6 flex flex-col items-center">
                        <div className="mb-2 font-semibold text-lg">{member.designation}</div>
                        <div className="relative w-32 h-32 mb-4 rounded-2xl overflow-hidden shadow-sm aspect-square bg-muted">
                            {member.photo?.url ? (
                                <Image
                                    src={member.photo.url}
                                    alt={member.name}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                    <Users className="h-10 w-10 text-gray-300" />
                                </div>
                            )}
                        </div>
                        <h3 className="font-bold text-xl mb-1">{member.name}</h3>
                        {member.place && (
                            <p className="text-muted-foreground text-sm">{member.place}</p>
                        )}

                        {isSparkAdmin && (
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => handleEdit(member)}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(member._id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
        {members.length === 0 && (
            <div className="text-center p-12 text-muted-foreground col-span-full">
                No committee members found.
            </div>
        )}
    </div>
);
}
