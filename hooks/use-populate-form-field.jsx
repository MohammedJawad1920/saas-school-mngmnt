"use client";
import useCrud from "@/hooks/use-crud";
import { formatOptions } from "@/lib/utils";

const usePopulateFormField = (field, apiKey, dependentValue) => {
  const { useFetchItems } = useCrud(field.resource, apiKey);
  const filters = field.apiFilters ? { ...field.apiFilters } : {};
  if (field.filter && dependentValue) {
    filters[field.filter.key] = dependentValue;
  }

  // Only fetch if resource matches logical condition (truthy)
  const shouldFetch = !!field.resource;

  const { data: fetched, isLoading } = useFetchItems(0, Infinity, filters, {
    enabled: shouldFetch,
  });

  const items = fetched?.[field.resource] || fetched?.data || [];
  const options = formatOptions(items, field.labelKey, field.valueKey);

  // If no resource, we likely don't want to override options unless we handle mixed cases, 
  // but for this specific hook's purpose (populate form field), it implies resource-based population.
  // If no resource, just return field usage?
  // The caller (PopupForm) used to switch: resource ? usePopulate... : field.
  // So if no resource, we should logically return 'field' but with existing options intact.

  if (!field.resource) return field;

  return {
    ...field,
    options,
    isLoading,
  };
};

export default usePopulateFormField;
