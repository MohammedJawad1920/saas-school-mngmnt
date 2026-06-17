"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Edit, Loader, Plus } from "lucide-react";
import { MultiSelect } from "./ui/multi-select";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useDynamicFormSchema } from "@/hooks/use-dynamic-form-schema";
import { getDefaultValues } from "@/lib/utils";
import ImageUploader from "./ImageUploader";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader } from "./ui/card";
import useCrud from "@/hooks/use-crud";
import { toast } from "sonner";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";
import { useRouter } from "next/navigation";
import { ColorInput } from "./ColorInput"; // Import the new ColorInput component

const SectionNavigation = ({
  ref,
  sectionOrder,
  activeIndex,
  setActiveIndex,
}) => (
  <div className="flex mb-4 border-b max-w-full overflow-x-auto hide-scrollbar">
    {sectionOrder.map((section, index) => (
      <button
        ref={(el) => (ref.current[index] = el)}
        key={section}
        type="button"
        className={`px-4 py-2 text-sm text-nowrap ${activeIndex === index
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground"
          }`}
        onClick={() => setActiveIndex(index)}
      >
        {section}
      </button>
    ))}
  </div>
);

const FormFields = ({ form, fields, apiKey }) =>
  fields.map((field, idx) => (
    <FormField
      key={idx}
      control={form.control}
      name={field.name}
      render={({ field: formField }) => (
        <FormItem className={field.className || "col-span-2 md:col-span-1"}>
          {field.label && !field.hideLabel && (
            <FormLabel htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </FormLabel>
          )}
          <FormControl>
            {field.inputType === "image" ? (
              <ImageUploader
                value={formField.value}
                onChange={(value) => formField.onChange(value)}
                disabled={field.disabled}
                apiKey={apiKey}
                maxFileSize={field.maxFileSize}
                allowedTypes={field.allowedTypes}
                minWidth={field.minWidth}
                minHeight={field.minHeight}
                maxWidth={field.maxWidth}
                maxHeight={field.maxHeight}
                aspectRatio={field.aspectRatio}
                readOnly={field.readOnly}
              />
            ) : field.inputType === "select" ||
              field.inputType === "multiSelect" ? (
              <MultiSelect
                options={field.options || []}
                placeholder={field.placeholder || "Select options"}
                multiSelect={field.inputType === "multiSelect"}
                value={formField.value}
                onValueChange={(value) => formField.onChange(value)}
                readOnly={field.readOnly}
                freeSolo={field.freeSolo}
              />
            ) : field.inputType === "toggle" ? (
              <div className="flex items-center space-x-2">
                <Label htmlFor={field.name} className="text-sm font-medium">
                  {field.onLabel && field.offLabel
                    ? (field.invertToggle ? !formField.value : !!formField.value)
                      ? field.onLabel
                      : field.offLabel
                    : field.label}
                </Label>
                <Switch
                  id={field.name}
                  checked={field.invertToggle ? !formField.value : (formField.value || false)}
                  onCheckedChange={(checked) => formField.onChange(field.invertToggle ? !checked : checked)}
                  disabled={field.disabled}
                />
              </div>
            ) : field.inputType === "color" ? (
              <ColorInput
                name={field.name}
                value={formField.value}
                onChange={(value) => formField.onChange(value)}
                onBlur={formField.onBlur}
                disabled={field.disabled}
                readOnly={field.readOnly}
                placeholder={field.placeholder || "Select a color"}
                showPalette={field.showPalette !== false}
                customColors={field.customColors}
              />
            ) : field.inputType === "textarea" ? (
              <Textarea
                placeholder={field.placeholder}
                {...formField}
                readOnly={field.readOnly}
                rows={field.rows || 3}
              />
            ) : (
              <Input
                type={field.type || "text"}
                placeholder={field.placeholder}
                {...formField}
                readOnly={field.readOnly}
              />
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  ));

const FormContent = ({
  form,
  formFields,
  handleSubmit,
  data,
  loading,
  apiKey,
  hideSubmitOn,
}) => {
  const sectionRefs = React.useRef([]);

  const sections = React.useMemo(() => {
    return formFields.reduce((acc, field) => {
      acc[field.section] = acc[field.section] || [];
      acc[field.section].push(field);
      return acc;
    }, {});
  }, [formFields]);

  const sectionOrder = Object.keys(sections);
  const [activeSectionIndex, setActiveSectionIndex] = React.useState(0);
  const totalSections = sectionOrder.length;
  const progress = ((activeSectionIndex + 1) / totalSections) * 100;

  React.useEffect(() => {
    if (sectionRefs.current[activeSectionIndex]) {
      sectionRefs.current[activeSectionIndex].scrollIntoView({
        behavior: "smooth",
        block: "end",
        inline: "end",
      });
    }
  }, [activeSectionIndex]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="max-w-full overflow-hidden"
      >
        {totalSections > 1 && (
          <div className="mb-4">
            <div className="flex mb-1 text-sm font-medium">
              <span>
                Step {activeSectionIndex + 1} of {totalSections}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
        {totalSections > 1 && (
          <SectionNavigation
            ref={sectionRefs}
            sectionOrder={sectionOrder}
            activeIndex={activeSectionIndex}
            setActiveIndex={setActiveSectionIndex}
          />
        )}
        <div className="px-2">
          {sectionOrder.map((section, index) => (
            <div
              key={section}
              className={`grid grid-cols-2 gap-4 ${activeSectionIndex === index ? "block" : "hidden"
                }`}
            >
              {section !== "undefined" && (
                <h2 className="text-lg font-bold col-span-2">{section}</h2>
              )}
              <FormFields
                form={form}
                fields={sections[section]}
                apiKey={apiKey}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-8">
          {activeSectionIndex > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveSectionIndex((prev) => prev - 1)}
            >
              Previous
            </Button>
          )}
          {activeSectionIndex === totalSections - 1 ? (
            (!hideSubmitOn ||
              form.getValues()[hideSubmitOn.field] !== hideSubmitOn.value ||
              form.formState.isDirty) && (
              <Button className="ml-auto" type="submit" disabled={loading}>
                {loading ? (
                  <Loader className="animate-spin mr-2" />
                ) : data ? (
                  "Save changes"
                ) : (
                  "Submit"
                )}
              </Button>
            )
          ) : (
            <Button
              type="button"
              className="ml-auto"
              onClick={(e) => {
                e.preventDefault();
                setActiveSectionIndex((prev) => prev + 1);
              }}
            >
              Next
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
};

export default function FormComponent({
  data = null,
  formFields = [],
  title = "",
  description = "",
  loading = false,
  apiKey,
  resource,
  returnBack = false,
  hideSubmitOn,
  onSuccess,
}) {
  const [customizedFormField, setCustomizedFormField] =
    React.useState(formFields);

  const router = useRouter();

  const { schema } = useDynamicFormSchema(customizedFormField);

  const defaultValues = React.useMemo(() => {
    return getDefaultValues(data, formFields);
  }, [data, formFields, schema]);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "all",
    key: data ? `edit-${data?._id}` : `create ${title}`,
  });

  const formValues = useWatch({ control: form.control });

  const { useAddItem, useUpdateItem } = useCrud(resource, apiKey);

  const addItem = useAddItem();
  const updateItem = useUpdateItem();

  const handleSubmit = React.useCallback(async () => {
    try {
      const values = form.getValues();

      if (data) {
        await updateItem.mutateAsync({
          data: { ids: [data._id], ...values },
        });
        toast.success("Updated successfully!");
        if (onSuccess) onSuccess();
      } else {
        await addItem.mutateAsync(values);
        toast.success("Saved successfully!");
        if (onSuccess) onSuccess();
      }
      if (returnBack) {
        router.back();
      }
    } catch (error) {
      console.error("Form submission failed:", error.message);
      toast.error(
        error?.message ||
        "Failed to save data. Please check the form and try again."
      );
      if (error.details?.errors) {
        error.details.errors.forEach(({ field, message }) => {
          const fieldLabel =
            formFields?.find((f) => f.name === field)?.label || "This value";
          form.setError(field, {
            type: "manual",
            message: `${fieldLabel} ${message}`,
          });
        });

        return;
      }
    } finally {
      if (!data) {
        form.reset();
      }
      router.refresh();
      if (data) {
        form.reset(form.getValues());
      }
    }
  }, [data, form, updateItem, addItem, returnBack, router]);

  React.useEffect(() => {
    setCustomizedFormField(
      formFields.filter(
        (field) =>
          (data ? !field?.hideOnEdit : true) &&
          (!field.conditionalRender ||
            (field.conditionalRender.expectedValue !== undefined
              ? field.conditionalRender.expectedValue ===
              formValues[field.conditionalRender.dependentField]
              : !!formValues[field.conditionalRender.dependentField]))
      )
    );
  }, [data, formFields, formValues]);

  return (
    <Card>
      <CardHeader className={title || description ? "p-6 pb-0" : "p-2"}>
        <div className="space-y-1.5">
          {title && (
            <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <FormContent
          key={data ? `edit-${data?._id}` : `create ${title}`}
          form={form}
          formFields={customizedFormField}
          handleSubmit={handleSubmit}
          data={data}
          loading={loading}
          apiKey={apiKey}
          hideSubmitOn={hideSubmitOn}
        />
      </CardContent>
    </Card>
  );
}
