"use client";
import * as React from "react";
import FormComponent from "./FormComponent";
import useCrud from "@/hooks/use-crud";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Edit2, Plus, Calendar as CalendarIcon, Share2 } from "lucide-react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ImageUploader from "@/components/ImageUploader";
import axios from "axios";
import { toast } from "sonner";

const formFields = [
  {
    name: "image",
    label: "Featured Image",
    inputType: "image",
    type: "object",
    className: "col-span-2",
  },
  {
    name: "heading",
    label: "Heading",
    placeholder: "Enter update heading",
    required: true,
    className: "col-span-2",
  },
  {
    name: "date",
    label: "Date",
    type: "date",
    defaultValue: new Date().toISOString().split("T")[0],
    className: "col-span-2 md:col-span-1",
  },
  {
    name: "news",
    label: "Update Content",
    inputType: "textarea",
    placeholder: "Enter update content",
    rows: 5,
    className: "col-span-2",
  },
];

export default function UpdatesManagement({ apiKey, initialUpdates = [], initialUpdatesLogo = null }) {
  const { useFetchItems, useDeleteItem } = useCrud("updates", apiKey);
  const { data: updatesData, isLoading } = useFetchItems(0, 100, {}, {
    initialData: { updates: initialUpdates },
  });
  const deleteItem = useDeleteItem();
  const [editingItem, setEditingItem] = React.useState(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [updatesLogo, setUpdatesLogo] = React.useState(initialUpdatesLogo);
  const [isUpdatingLogo, setIsUpdatingLogo] = React.useState(false);
  const [itemToDelete, setItemToDelete] = React.useState(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false);

  // Sync state with initial data when it changes
  React.useEffect(() => {
    setUpdatesLogo(initialUpdatesLogo);
  }, [initialUpdatesLogo]);

  const updates = updatesData?.updates || [];

  const handleLogoUpdate = async (image) => {
    try {
      setIsUpdatingLogo(true);
      const response = await axios.put("/api/settings", {
        updatesLogo: image,
      });
      setUpdatesLogo(image);
      toast.success("Updates logo updated successfully!");
    } catch (error) {
      console.error("Error updating logo:", error);
      toast.error("Failed to update logo");
    } finally {
      setIsUpdatingLogo(false);
    }
  };

  const handleDelete = async () => {
    if (itemToDelete) {
      await deleteItem.mutateAsync({ data: { ids: [itemToDelete._id] } });
      setItemToDelete(null);
      setIsDeleteAlertOpen(false);
      toast.success("Update deleted successfully");
    }
  };

  const confirmDelete = (item) => {
    setItemToDelete(item);
    setIsDeleteAlertOpen(true);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              This action cannot be undone. This will permanently delete the update
              <span className="font-semibold text-gray-900 block mt-1">"{itemToDelete?.heading}"</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white rounded-full"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Card className="bg-emerald-50/50 border-emerald-100 shadow-sm overflow-hidden">
        <div className="bg-emerald-600/5 px-6 py-3 border-b border-emerald-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <CardTitle className="text-sm font-bold text-emerald-800 uppercase tracking-wider">Updates Section Branding</CardTitle>
          </div>
          {updatesLogo?.url && (
            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase">
              Logo Active
            </span>
          )}
        </div>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-1">Upload Section Logo</h4>
                <p className="text-xs text-gray-500">This logo will be displayed prominently in the header of the public updates page.</p>
              </div>
              <div className="w-full max-w-[280px]">
                <ImageUploader
                  value={updatesLogo}
                  onChange={handleLogoUpdate}
                  disabled={isUpdatingLogo}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-800 mb-1">Live Preview</h4>
              <div className="h-40 w-full bg-emerald-800 rounded-xl border border-emerald-700/30 flex items-center justify-center p-4 shadow-inner overflow-hidden relative group">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                {updatesLogo?.url ? (
                  <img
                    src={updatesLogo.url}
                    alt="Updates Header Preview"
                    className="relative z-10 max-h-full max-w-full object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="text-emerald-300/50 flex flex-col items-center gap-2">
                    <Plus className="w-8 h-8 opacity-20" />
                    <span className="text-xs font-medium uppercase tracking-widest opacity-40">No Logo Set</span>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-center text-emerald-600 font-medium italic">
                * This is how the logo will appear in the emerald header column.
              </p>
            </div>

          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Latest Updates</h2>
        <Dialog 
          open={isDialogOpen} 
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingItem(null);
          }}
        >
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Update
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Update" : "Add New Update"}</DialogTitle>
            </DialogHeader>
            <FormComponent
              formFields={formFields}
              apiKey={apiKey}
              resource="updates"
              data={editingItem}
              onSuccess={() => {
                setIsDialogOpen(false);
                setEditingItem(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-6 w-full">
        {updates.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <p className="text-gray-500 font-medium">No updates found. Start by adding one!</p>
          </div>
        ) : (
          updates.map((update) => (
            <Card key={update._id} className="overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 bg-white rounded-xl group">
              <div className="flex flex-col md:flex-row">
                {update.image?.url && (
                  <div className="relative w-full md:w-48 h-40 md:h-auto overflow-hidden flex-shrink-0">
                    <Image
                      src={update.image.url}
                      alt={update.heading}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                )}
                <div className="flex-1 p-4 md:p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center gap-1.5 text-emerald-600 text-[9px] font-bold uppercase tracking-widest">
                          <CalendarIcon className="w-2.5 h-2.5" />
                          {update.date ? format(new Date(update.date), "PPP") : "Recent Update"}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 leading-tight group-hover:text-emerald-700 transition-colors line-clamp-1">
                          {update.heading}
                        </h3>
                      </div>
                      <div className="flex gap-1.5 ml-3">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-7 w-7 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 border-none"
                          onClick={() => {
                            setEditingItem({
                              ...update,
                              date: update.date ? new Date(update.date).toISOString().split("T")[0] : "",
                            });
                            setIsDialogOpen(true);
                          }}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-7 w-7 rounded-full bg-red-50 text-red-600 hover:bg-red-100 border-none"
                          onClick={() => confirmDelete(update)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-7 w-7 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-none"
                          title="Share this update"
                          onClick={async () => {
                            const boldTitle = `*${update.heading}*`;
                            const shareData = {
                              title: update.heading,
                              text: `${boldTitle}\n\n${update.news || update.heading}`,
                              url: `${window.location.origin}/updates/${update._id}`,
                            };
                            if (navigator.share) {
                              try {
                                await navigator.share(shareData);
                              } catch (err) {
                                if (err.name !== "AbortError") {
                                  toast.error("Share failed");
                                }
                              }
                            } else {
                              navigator.clipboard.writeText(
                                `*${update.heading}*\n\n${update.news || ""}\n\n${window.location.origin}/updates/${update._id}`
                              );
                              toast.success("Copied to clipboard!");
                            }
                          }}
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap line-clamp-2">
                      {update.news}
                    </p>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between text-[9px] text-gray-400">
                    <span>ID: {update._id}</span>
                    <span className="font-medium text-emerald-600/40 uppercase tracking-widest">Orchid Update</span>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
