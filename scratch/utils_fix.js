const getDefaultValues = (data, formFields) => {
  const defaults = {};
  let flatData = data;

  if (data) {
    flatData = {
      ...data,
      ...(data.address || {}),
      ...(data.profilePic || {})
    };
  }

  formFields.forEach((field) => {
    const value = flatData ? flatData[field.name] : undefined;

    if (flatData && value !== undefined && value !== null) {
      // Handle objects for select/async fields by extracting the ID
      if (value && typeof value === 'object' && !Array.isArray(value) && 
          ['select', 'async-text'].includes(field.inputType)) {
        defaults[field.name] = value._id || value.id || value;
      } else if (field.type === "date") {
        if (typeof value === "string" && value.includes("T")) {
          defaults[field.name] = value.split("T")[0];
        } else {
          try {
            const parsedDate = new Date(value);
            if (!isNaN(parsedDate.getTime())) {
               defaults[field.name] = parsedDate.toISOString().split("T")[0];
            } else {
               defaults[field.name] = value;
            }
          } catch(e) {
            defaults[field.name] = value;
          }
        }
      } else {
        defaults[field.name] = value;
      }
    } else if (field.defaultValue !== undefined) {
      defaults[field.name] = field.defaultValue;
    } else if (field.inputType === "multiSelect") {
      defaults[field.name] = [];
    } else if (field.type === "number") {
      defaults[field.name] = "";
    } else {
      defaults[field.name] = "";
    }
  });
  return defaults;
};
