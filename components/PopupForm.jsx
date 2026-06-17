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
import RangeInput from "./RangeInput";
import usePopulateFormField from "@/hooks/use-populate-form-field";
import { toast } from "sonner";
import { ScanBarcode } from "lucide-react";
import ColorInput from "./ColorInput";
import dynamic from "next/dynamic";

const BarcodeScanner = dynamic(() => import("./BarcodeScanner"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <Loader className="h-8 w-8 animate-spin text-primary" />
    </div>
  ),
});

/* ---------- AsyncInput Component ---------- */
const AsyncInput = ({
  value,
  onChange,
  placeholder,
  disabled,
  readOnly,
  autoFocus,
  asyncProps = {},
  ...props
}) => {
  const [preview, setPreview] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(async () => {
      // Basic validation to avoid spamming
      if (!value || String(value).length < 2) {
        setPreview(null);
        return;
      }

      setLoading(true);
      try {
        const { endpoint, queryKey = "_id", displayKey = "name", responseKey = "data", ...fetchOptions } = asyncProps;
        // Construct query correctly
        let url = `${endpoint}?${queryKey}=${encodeURIComponent(value)}`;
        if (displayKey) {
          url += `&projection=${displayKey}`;
        }

        const res = await fetch(url, { ...fetchOptions, credentials: "include" });
        if (res.ok) {
          const json = await res.json();
          // Try to find the list in responseKey or known fallbacks
          const list = json[responseKey] || json.data || json.users || [];
          const item = Array.isArray(list) && list.length > 0 ? list[0] : null;

          if (item) {
            setPreview(item[displayKey] || "Unknown");
          } else {
            setPreview("Not found");
          }
        } else {
          setPreview("Error fetching data");
        }
      } catch (err) {
        console.error(err);
        setPreview("Error");
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [value, asyncProps]);

  return (
    <div className="space-y-1">
      <Input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        autoFocus={autoFocus}
        {...props}
      />
      {loading && <div className="text-xs text-muted-foreground animate-pulse">Checking...</div>}
      {!loading && preview && (
        <div className={`text-xs ${preview === "Not found" || preview.startsWith("Error") ? "text-destructive" : "text-green-600 font-medium"}`}>
          {preview}
        </div>
      )}
    </div>
  );
};

/* ---------- SectionNavigation (unchanged) ---------- */
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

// New component to render a single field and handle data population
const PopulatedField = ({ field, form, apiKey, data, capitalizeInputs }) => {
  const dependentValue = field.filter?.dependentField
    ? useWatch({ control: form.control, name: field.filter.dependentField })
    : null;

  const populatedField = usePopulateFormField(field, apiKey, dependentValue);

  return <FieldRenderer field={populatedField} form={form} apiKey={apiKey} data={data} capitalizeInputs={capitalizeInputs} />;
};

/* ---------- FieldRenderer: simplified for direct rendering ---------- */
function FieldRenderer({ field, form, apiKey, data, capitalizeInputs }) {
  const depName =
    field.conditionalRender?.dependentField || field.filter?.dependentField;
  const depValue = useWatch({ control: form.control, name: depName });
  const thisValue = useWatch({ control: form.control, name: field.name });

  // Auto-selection logic for fields like subjectTypeAssignments
  const autoSelectValue = useWatch({ control: form.control, name: field.autoSelectFrom });
  const prevAutoSelectValue = React.useRef(autoSelectValue);

  React.useEffect(() => {
    // Only run if autoSelectFrom is defined and the source value changed
    if (field.autoSelectFrom && autoSelectValue && autoSelectValue !== prevAutoSelectValue.current) {
      const currentValues = Array.isArray(thisValue) ? thisValue : [];
      
      // Determine what to add
      const coreVal = `${autoSelectValue}:CORE`;
      const majorVal = `${autoSelectValue}:MAJOR`;
      
      // Determine what to remove (the previous class's assignments if any)
      let newValues = [...currentValues];
      if (prevAutoSelectValue.current) {
        const prevCore = `${prevAutoSelectValue.current}:CORE`;
        const prevMajor = `${prevAutoSelectValue.current}:MAJOR`;
        newValues = newValues.filter(v => v !== prevCore && v !== prevMajor);
      }
      
      // Add new ones if not present
      if (!newValues.includes(coreVal)) newValues.push(coreVal);
      if (!newValues.includes(majorVal)) newValues.push(majorVal);
      
      form.setValue(field.name, newValues, { shouldDirty: true });
      prevAutoSelectValue.current = autoSelectValue;
    }
  }, [autoSelectValue, field.autoSelectFrom, field.name, form, thisValue]);

  const watchedValues = {};
  const multipleFilters = field.filters || (field.filter ? [field.filter] : []);
  multipleFilters.forEach((filter) => {
    if (filter.dependentField) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      watchedValues[filter.dependentField] = useWatch({
        control: form.control,
        name: filter.dependentField,
      });
    }
  });

  const mergedOptions = React.useMemo(() => {
    if (!field.resource) { // Only apply client-side filtering if not using a resource
      if (field.filter && !field.filters) {
        const dependentFieldName = field.filter.dependentField;
        const key = field.filter.key;
        const valueToMatch = depValue;
        const filteredOptions = (field.options || []).filter((option) => {
          if (!valueToMatch) return true;
          if (key) {
            return option?.[dependentFieldName]?.[key] === valueToMatch;
          }
          return option?.[dependentFieldName] === valueToMatch;
        });
        const selectedOptions = (field.options || []).filter((option) =>
          Array.isArray(thisValue)
            ? thisValue.includes(option.value)
            : thisValue === option.value
        );
        return [
          ...filteredOptions,
          ...selectedOptions.filter(
            (opt) => !filteredOptions.some((f) => f.value === opt.value)
          ),
        ];
      }
      if (field.filters && field.filters.length > 0) {
        let filteredOptions = field.options || [];
        field.filters.forEach((filter) => {
          const dependentFieldName = filter.dependentField;
          const key = filter.key;
          const valueToMatch = watchedValues[dependentFieldName];
          if (valueToMatch) {
            filteredOptions = filteredOptions.filter((option) => {
              if (key) {
                return option?.[dependentFieldName]?.[key] === valueToMatch;
              }
              return option?.[dependentFieldName] === valueToMatch;
            });
          }
        });
        const selectedOptions = (field.options || []).filter((option) =>
          Array.isArray(thisValue)
            ? thisValue.includes(option.value)
            : thisValue === option.value
        );
        return [
          ...filteredOptions,
          ...selectedOptions.filter(
            (opt) => !filteredOptions.some((f) => f.value === opt.value)
          ),
        ];
      }
    }
    return field.options ?? [];
  }, [
    field.resource,
    field.options,
    field.filter,
    field.filters,
    depValue,
    thisValue,
    watchedValues,
  ]);

  const fieldToRender = { ...field, options: mergedOptions };


  const [showScanner, setShowScanner] = React.useState(false);

  const handleScanFinish = (result) => {
    form.setValue(fieldToRender.name, result, { shouldDirty: true, shouldValidate: true });
    setShowScanner(false);
  };

  if (data?._id && field.hideOnEdit) return null;

  if (field.conditionalRender) {
    const expected = field.conditionalRender.expectedValue;
    if (expected !== undefined) {
      if (depValue !== expected) return null;
    } else {
      if (!depValue) return null;
    }
  }

  return (
    <FormField
      control={form.control}
      name={fieldToRender.name}
      render={({ field: formField }) => (
        <FormItem className={fieldToRender.className}>
          {fieldToRender.label && !fieldToRender.hideLabel && (
            <FormLabel htmlFor={fieldToRender.name}>
              {fieldToRender.label}
              {fieldToRender.required && <span className="text-red-500 ml-1">*</span>}
            </FormLabel>
          )}
          <FormControl>
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                {fieldToRender.inputType === "image" ? (
                  <ImageUploader
                    value={formField.value}
                    onChange={(val) => formField.onChange(val)}
                    disabled={fieldToRender.disabled}
                    apiKey={apiKey}
                    maxFileSize={fieldToRender.maxFileSize}
                    allowedTypes={fieldToRender.allowedTypes}
                    minWidth={fieldToRender.minWidth}
                    minHeight={fieldToRender.minHeight}
                    maxWidth={fieldToRender.maxWidth}
                    maxHeight={fieldToRender.maxHeight}
                    aspectRatio={fieldToRender.aspectRatio}
                    readOnly={(data?._id && fieldToRender.readOnlyOnEdit) || fieldToRender.readOnly}
                  />
                ) : fieldToRender.inputType === "select" ||
                  fieldToRender.inputType === "multiSelect" ? (
                  <MultiSelect
                    options={fieldToRender.options || []}
                    placeholder={fieldToRender.placeholder || "Select options"}
                    multiSelect={fieldToRender.inputType === "multiSelect"}
                    value={formField.value}
                    onValueChange={(value) => formField.onChange(value)}
                    variant={fieldToRender.variant || "default"}
                    maxCount={fieldToRender.maxCount}
                    disableSearch={fieldToRender.disableSearch}
                    freeSolo={fieldToRender.freeSolo}
                    showSelectedCount={fieldToRender.showSelectedCount}
                    readOnly={(data?._id && fieldToRender.readOnlyOnEdit) || fieldToRender.readOnly}
                    isLoading={fieldToRender.isLoading}
                  />
                ) : fieldToRender.inputType === "range" ? (
                  <RangeInput
                    min={fieldToRender.min}
                    max={fieldToRender.max}
                    step={fieldToRender.step}
                    unit={fieldToRender.unit}
                    value={formField.value}
                    onChange={(value) => formField.onChange(value)}
                    disabled={fieldToRender.disabled}
                    variant={fieldToRender.variant || "default"}
                    type={fieldToRender.type || "number"}
                    placeholder={fieldToRender.placeholder}
                    fromLabel={fieldToRender.fromLabel || "From"}
                    toLabel={fieldToRender.toLabel || "To"}
                    className={fieldToRender.className}
                    readOnly={(data?._id && fieldToRender.readOnlyOnEdit) || fieldToRender.readOnly}
                    {...fieldToRender.props}
                  />
                ) : fieldToRender.inputType === "color" ? (
                  <ColorInput
                    disabled={fieldToRender.disabled}
                    readOnly={(data?._id && fieldToRender.readOnlyOnEdit) || fieldToRender.readOnly}
                    {...fieldToRender.props}
                    {...formField}
                  />
                ) : fieldToRender.inputType === "async-text" ? (
                  <AsyncInput
                    value={((capitalizeInputs && fieldToRender.name !== "email" && fieldToRender.type !== "email" && typeof formField.value === "string") ? formField.value.toUpperCase() : formField.value)}
                    onChange={(e) => {
                      const val = e && e.target ? e.target.value : e;
                      const uppercaseVal = typeof val === "string" ? val.toUpperCase() : val;
                      if (e && e.target) {
                        e.target.value = uppercaseVal;
                      }
                      formField.onChange(uppercaseVal);
                    }}
                    placeholder={fieldToRender.placeholder}
                    disabled={fieldToRender.disabled}
                    readOnly={(data?._id && fieldToRender.readOnlyOnEdit) || fieldToRender.readOnly}
                    asyncProps={fieldToRender.asyncProps}
                    autoFocus={fieldToRender.autoFocus}
                    className={capitalizeInputs && fieldToRender.name !== "email" ? "uppercase" : ""}
                    {...formField}
                  />
                ) : (
                  <Input
                    type={fieldToRender.type || "text"}
                    placeholder={fieldToRender.placeholder}
                    readOnly={(data?._id && fieldToRender.readOnlyOnEdit) || fieldToRender.readOnly}
                    autoFocus={fieldToRender.autoFocus}
                    className={capitalizeInputs && fieldToRender.name !== "email" ? "uppercase" : ""}
                    {...formField}
                    value={((capitalizeInputs && fieldToRender.name !== "email" && fieldToRender.type !== "email" && typeof formField.value === "string") ? formField.value.toUpperCase() : formField.value)}
                    onChange={(e) => {
                      const val = e && e.target ? e.target.value : e;
                      const uppercaseVal = typeof val === "string" ? val.toUpperCase() : val;
                      if (e && e.target) {
                        e.target.value = uppercaseVal;
                      }
                      formField.onChange(uppercaseVal);
                    }}
                  />
                )}
              </div>
              {fieldToRender.enableScanner && (
                <Dialog open={showScanner} onOpenChange={setShowScanner}>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0 h-10 w-10 bg-foreground text-background hover:bg-foreground/90 border-none"
                      title="Scan Barcode"
                    >
                      <ScanBarcode className="h-5 w-5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Scan Barcode ({fieldToRender.label})</DialogTitle>
                      <DialogDescription>
                        Scan a barcode to automatically fill the {fieldToRender.label} field.
                      </DialogDescription>
                    </DialogHeader>
                    <BarcodeScanner
                      onScan={handleScanFinish}
                      onClose={() => setShowScanner(false)}
                    />
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

const FormFields = ({ form, fields, apiKey, data, capitalizeInputs }) =>
  fields.map((field, idx) => (
    <PopulatedField
      key={field.name ?? idx}
      field={field}
      form={form}
      apiKey={apiKey}
      data={data}
      capitalizeInputs={capitalizeInputs}
    />
  ));

/* ---------- FormContent with Data Population ---------- */
const FormContent = ({
  form,
  formFields,
  handleSubmit,
  data,
  loading,
  apiKey,
  submitButtonClass,
  buttonContainerClass,
  capitalizeInputs,
}) => {
  const sectionRefs = React.useRef([]);

  const sections = React.useMemo(() => {
    return formFields.reduce((acc, field) => {
      acc[field.section] = acc[field.section] || [];
      acc[field.section].push(field);
      return acc;
    }, {});
  }, [formFields]);

  const sectionOrder = React.useMemo(() => Object.keys(sections), [sections]);
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



  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') {
        return;
      }
      e.preventDefault();
      const formElement = e.currentTarget;
      const focusableElements = Array.from(
        formElement.querySelectorAll(
          'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button[type="submit"]:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter(el => el.offsetParent !== null); // Ensure element is visible

      const index = focusableElements.indexOf(e.target);
      if (index > -1 && index < focusableElements.length - 1) {
        focusableElements[index + 1].focus();
      }
    }
  };

  return (
    <Form {...form}>
      <form
        onKeyDown={handleKeyDown}
        onSubmit={form.handleSubmit(
          (validatedValues) => handleSubmit(validatedValues),
          (errors) => {
            console.warn("DEBUG: Full Validation Errors (Stringify):", JSON.stringify(errors, (key, val) => key === 'ref' ? undefined : val, 2));
            // Format for easy reading
            const formattedErrors = Object.entries(errors).reduce((acc, [key, err]) => {
              acc[key] = err?.message || (typeof err === "string" ? err : "Invalid value");
              return acc;
            }, {});
            console.warn("Formatted Validation Errors:", formattedErrors);
            const errorMessages = Object.values(formattedErrors).join(", ");
            toast.error(`Please fill all required fields correctly. Errors: ${errorMessages}`);
          }
        )}
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
        <div className="max-h-[60vh] overflow-y-auto px-2">
          {sectionOrder.map((section, index) => (
            <div
              key={section}
              className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${activeSectionIndex === index ? "grid" : "hidden"}`}
            >
              {section !== "undefined" && (
                <h2 className="text-lg font-bold md:col-span-2">{section}</h2>
              )}
              <FormFields
                form={form}
                fields={sections[section]}
                apiKey={apiKey}
                data={data}
                capitalizeInputs={capitalizeInputs}
              />
              {/* Navigation buttons inline with last input */}
              <div className={`flex items-end gap-2 pb-1 ${buttonContainerClass || ""}`}>
                {activeSectionIndex > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setActiveSectionIndex((prev) => prev - 1)}
                  >
                    Previous
                  </Button>
                )}
                {activeSectionIndex === totalSections - 1 ? (
                  <Button
                    className={submitButtonClass || "flex-1"}
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader className="animate-spin mr-2" />
                    ) : (
                      "Save changes"
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveSectionIndex((prev) => prev + 1);
                    }}
                  >
                    Next
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </form>
    </Form>
  );
};

/* ---------- PopupForm (main) ---------- */
export default function PopupForm({
  title = "Form",
  description = "",
  formFields,
  data = null,
  onSubmit, // Expected to be an async function returning true on success
  hideButton = false,
  apiKey = null,
  loading: externalLoading = false,
  trigger = null,
  open: externalOpen,
  onOpenChange,
  className,
  submitButtonClass,
  triggerClass,
  triggerText,
  triggerVariant,
  buttonContainerClass,
  capitalizeInputs = false,
}) {
  // Use either external state (if provided) or internal state
  const isControlled = externalOpen !== undefined;
  const [internalOpen, setInternalOpen] = React.useState(false);

  const open = isControlled ? externalOpen : internalOpen;
  const handleOpenChange = (newOpen) => {
    if (isControlled && onOpenChange) {
      onOpenChange(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
  };

  const [loading, setLoading] = React.useState(false);
  const isSubmittingRef = React.useRef(false);

  // Custom form fields to handle object nesting
  const customFormFields = React.useMemo(() => {
    if (!formFields) return [];

    // Convert object values into appropriate structures for inputs
    if (data) {
      return formFields.map(field => {
        // Find if this field exists in the data as an object
        const value = data[field.name];

        let newField = { ...field };

        // Explicitly handle color field to ensure it populates from data OR default
        if (field.name === 'color') {
          newField.defaultValue = value || field.defaultValue || "#808080";
        } else if (value && typeof value === 'object' && !Array.isArray(value) &&
          ['select', 'async-text'].includes(field.inputType)) {
          // Use the _id if available, otherwise keep original
          newField.defaultValue = value._id || value.id || value;
        } else if (value !== undefined && value !== null) {
          newField.defaultValue = value;
        }

        return newField;
      });
    }
    return formFields;
  }, [formFields, data]);

  const { schema } = useDynamicFormSchema(customFormFields);

  const customDefaultValues = React.useMemo(() => {
    const defaults = getDefaultValues(data, customFormFields);
    if (capitalizeInputs) {
      Object.keys(defaults).forEach(key => {
        const fieldConfig = customFormFields.find(f => f.name === key);
        const isTextInput = !fieldConfig || (!fieldConfig.inputType && fieldConfig.type !== "date") || fieldConfig.inputType === "async-text";
        if (key !== "email" && typeof defaults[key] === "string" && isTextInput) {
          defaults[key] = defaults[key].toUpperCase();
        }
      });
    }
    return defaults;
  }, [data, customFormFields, capitalizeInputs]);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: customDefaultValues,
  });

  const prevOpen = React.useRef(open);
  const prevDataId = React.useRef(data ? (data._id || 'has-data') : 'no-data');

  // Reset form when form is opened/closed or data changes
  React.useEffect(() => {
    const currentDataId = data ? (data._id || 'has-data') : 'no-data';

    // Only reset if it just opened, just closed, or data identity fundamentally changed
    // This prevents periodic background refetches from randomly wiping out all typed form inputs
    if (open !== prevOpen.current || currentDataId !== prevDataId.current) {
      form.reset(customDefaultValues);
      prevOpen.current = open;
      prevDataId.current = currentDataId;
      isSubmittingRef.current = false;
    }
  }, [open, data, customDefaultValues, form]);

  const handleSubmit = React.useCallback(async (passedValues) => {
    if (isSubmittingRef.current) return;
    let didSubmitSuccessfully = false;
    try {
      isSubmittingRef.current = true;
      setLoading(true);
      // Use passed values if available (from form.handleSubmit), otherwise fallback to current values
      const values = passedValues || form.getValues();
      const success = await onSubmit(values);

      if (success !== false) {
        didSubmitSuccessfully = true;
        // Wait for the dialog animation to complete before resetting and closing
        handleOpenChange(false);
        setTimeout(() => {
          form.reset(customDefaultValues);
        }, 150);
      }
    } catch (error) {
      console.error("Form submission failed:", error.message);

      // Attempt to set form errors if the error response provides field-level details
      if (error.details?.errors) {
        Object.entries(error.details.errors).forEach(([field, message]) => {
          // Find the label for the field to provide a more readable error
          const fieldLabel = customFormFields.find(f => f.name === field)?.label || field;

          form.setError(field, {
            type: "manual",
            message: `${fieldLabel} ${message}`,
          });
        });
      }
    } finally {
      setLoading(false);
      if (!didSubmitSuccessfully) {
        isSubmittingRef.current = false;
      }
    }
  }, [form, customFormFields, onSubmit, handleOpenChange, customDefaultValues]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ? trigger : (!hideButton && (
          <Button variant={triggerVariant || (triggerClass ? "default" : "outline")} className={triggerClass}>
            {data ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {triggerText && <span className="ml-2">{triggerText}</span>}
          </Button>
        ))}
      </DialogTrigger>

      <DialogContent className={className}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <FormContent
          key={data ? `edit-${data?._id}` : `create-${title}`}
          form={form}
          formFields={customFormFields}
          handleSubmit={handleSubmit}
          data={data}
          loading={loading}
          apiKey={apiKey}
          submitButtonClass={submitButtonClass}
          buttonContainerClass={buttonContainerClass}
          capitalizeInputs={capitalizeInputs}
        />
      </DialogContent>
    </Dialog>
  );
}
