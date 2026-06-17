"use client";
import * as React from "react";
import FormComponent from "./FormComponent";
import useCrud from "@/hooks/use-crud";
import { format } from "date-fns";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Edit2, Plus, Calendar as CalendarIcon, BookOpen, User, Share2 } from "lucide-react";
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
import { toast } from "sonner";

const formFields = [
  {
    name: "image",
    label: "Featured Image",
    inputType: "image",
    type: "object",
    className: "col-span-2",
    required: false,
  },
  {
    name: "title",
    label: "Title",
    placeholder: "Enter article title",
    required: true,
    className: "col-span-2",
  },
  {
    name: "author",
    label: "Name of the Writer",
    placeholder: "Enter writer's name",
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
    name: "content",
    label: "Article Content",
    inputType: "textarea",
    placeholder: "Enter article content",
    rows: 5,
    className: "col-span-2",
  },
];

export default function ArticlesManagement({ apiKey, initialArticles = [] }) {
  const { useFetchItems, useDeleteItem } = useCrud("articles", apiKey);
  const { data: articlesData, isLoading } = useFetchItems(0, 100, {}, {
    initialData: { articles: initialArticles },
  });
  const deleteItem = useDeleteItem();
  const [editingItem, setEditingItem] = React.useState(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [itemToDelete, setItemToDelete] = React.useState(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false);

  const articles = articlesData?.articles || [];

  const handleDelete = async () => {
    if (itemToDelete) {
      await deleteItem.mutateAsync({ data: { ids: [itemToDelete._id] } });
      setItemToDelete(null);
      setIsDeleteAlertOpen(false);
      toast.success("Article deleted successfully");
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
              This action cannot be undone. This will permanently delete the article
              <span className="font-semibold text-gray-900 block mt-1">"{itemToDelete?.title}"</span>
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

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Latest Articles</h2>
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
              Add Article
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Article" : "Add New Article"}</DialogTitle>
            </DialogHeader>
            <FormComponent
              formFields={formFields}
              apiKey={apiKey}
              resource="articles"
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
        {articles.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <BookOpen className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No articles found. Start by adding one!</p>
          </div>
        ) : (
          articles.map((article) => (
            <Card key={article._id} className="overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 bg-white rounded-xl group">
              <div className="flex flex-col md:flex-row">
                {article.image?.url && (
                  <div className="relative w-full md:w-48 h-40 md:h-auto overflow-hidden flex-shrink-0">
                    <Image
                      src={article.image.url}
                      alt={article.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                )}
                <div className="flex-1 p-4 md:p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center gap-1.5 text-blue-600 text-[9px] font-bold uppercase tracking-widest">
                          <CalendarIcon className="w-2.5 h-2.5" />
                          {article.date ? format(new Date(article.date), "PPP") : "Recent Article"}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 leading-tight group-hover:text-blue-700 transition-colors line-clamp-1">
                          {article.title}
                        </h3>
                        {article.author && (
                          <div className="flex items-center gap-1 text-gray-500 text-xs">
                            <User className="w-3 h-3" />
                            <span>{article.author}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1.5 ml-3">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-7 w-7 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 border-none"
                          onClick={() => {
                            setEditingItem({
                              ...article,
                              date: article.date ? new Date(article.date).toISOString().split("T")[0] : "",
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
                          onClick={() => confirmDelete(article)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-7 w-7 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 border-none"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const boldTitle = `*${article.title}*`;
                            const shareData = {
                              title: article.title,
                              text: `${boldTitle}\n\n${article.content || article.title}`,
                              url: `${window.location.origin}/articles/${article._id}`,
                            };
                            if (navigator.share) {
                              try { await navigator.share(shareData); }
                              catch (err) { if (err.name !== "AbortError") toast.error("Share failed"); }
                            } else {
                              navigator.clipboard.writeText(`*${article.title}*\n\n${article.content || ""}\n\n${window.location.origin}/articles/${article._id}`);
                              toast.success("Copied to clipboard!");
                            }
                          }}
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap line-clamp-2">
                      {article.content}
                    </p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between text-[9px] text-gray-400">
                    <span>ID: {article._id}</span>
                    <span className="font-medium text-blue-600/40 uppercase tracking-widest">Orchid Article</span>
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
