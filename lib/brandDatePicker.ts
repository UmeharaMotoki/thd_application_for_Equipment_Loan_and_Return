/** MUI DatePicker（#007D9E カレンダー）— 貸与・返却で共通 */

export const CALENDAR_BRAND_BG = "#007D9E";
export const CALENDAR_HOLIDAY_BG = "#2E7D32";
export const CALENDAR_WEEKDAY_BG = "#FFFFFF";
export const CALENDAR_HOLIDAY_TEXT = "#FFFFFF";
export const CALENDAR_WEEKDAY_TEXT = CALENDAR_HOLIDAY_BG;

export const datePickerTextFieldSx = {
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
  colorScheme: "light",
  "& .MuiInputBase-root": {
    minHeight: 46,
    height: "auto",
    alignItems: "center",
    colorScheme: "light",
    bgcolor: "#fff",
  },
  "& .MuiInputBase-input": {
    py: 1,
    minHeight: "1.25em",
    color: "#171717",
    colorScheme: "light",
  },
} as const;

export const brandDatePickerLayoutSx = {
  bgcolor: "#fff",
  color: "#171717",
  "& .MuiPickersLayout-root": { bgcolor: "#fff", color: "#171717" },
  "& .MuiPickersToolbar-root": { bgcolor: "#fff", color: "#171717" },
  "& .MuiPickersToolbar-penIconButton": { color: "#171717" },
  "& .MuiDateCalendar-root": { bgcolor: "#fff" },
  "& .MuiPickersCalendarHeader-root": { color: "#171717" },
  "& .MuiPickersCalendarHeader-label": { color: "#171717" },
  "& .MuiPickersArrowSwitcher-root .MuiIconButton-root": { color: "#171717" },
  "& .MuiYearCalendar-button": { color: "#171717" },
  "& .MuiYearCalendar-button.MuiYearCalendar-selected": {
    bgcolor: CALENDAR_BRAND_BG,
    color: "#fff",
    "&:hover, &:focus": { bgcolor: CALENDAR_BRAND_BG, color: "#fff" },
  },
  "& .MuiMonthCalendar-button": { color: "#171717" },
  "& .MuiMonthCalendar-button.MuiMonthCalendar-selected": {
    bgcolor: CALENDAR_BRAND_BG,
    color: "#fff",
    "&:hover, &:focus": { bgcolor: CALENDAR_BRAND_BG, color: "#fff" },
  },
  "& .MuiDayCalendar-weekDayLabel": { color: "#6b7280" },
  "& .MuiPickerDay-root": { color: "#171717" },
  "& .MuiPickerDay-root.MuiPickerDay-dayOutsideMonth": {
    color: "#cfcfcf",
  },
  "& .MuiPickerDay-root.MuiPickerDay-selected": {
    backgroundColor: `${CALENDAR_BRAND_BG} !important`,
    color: "#fff !important",
    "&:hover, &:focus": {
      backgroundColor: `${CALENDAR_BRAND_BG} !important`,
      color: "#fff !important",
    },
  },
  "& .MuiPickerDay-root:not(.MuiPickerDay-selected):hover": {
    backgroundColor: "#f3f4f6",
  },
  "& .MuiPickerDay-root.MuiPickerDay-today:not(.MuiPickerDay-selected)": {
    outline: "1px solid #9ca3af",
    outlineOffset: -1,
  },
  "& .MuiPickerDay-root.MuiPickerDay-today.MuiPickerDay-selected": {
    outline: "none",
    border: "1px solid #fff",
  },
} as const;

export const brandDatePickerSlotProps = {
  desktopPaper: {
    elevation: 6,
    sx: {
      bgcolor: "#fff",
      color: "#171717",
      backgroundImage: "none",
    },
  },
  mobilePaper: {
    sx: {
      bgcolor: "#fff",
      color: "#171717",
      backgroundImage: "none",
    },
  },
  layout: {
    sx: brandDatePickerLayoutSx,
  },
  actionBar: {
    sx: {
      bgcolor: "#fff",
      "& .MuiButton-root": { color: CALENDAR_BRAND_BG },
    },
  },
  day: ({ day }: { day: { day: () => number } }) => {
    const week = day.day();
    const isHoliday = week === 0 || week === 6;
    const baseBg = isHoliday ? CALENDAR_BRAND_BG : "#FFFFFF";
    const baseText = isHoliday ? "#FFFFFF" : "#171717";
    return {
      sx: {
        bgcolor: `${baseBg} !important`,
        color: `${baseText} !important`,
        borderRadius: "6px",
        border: "1px solid rgba(0,0,0,0.08)",
        "&:hover, &:focus": {
          bgcolor: `${baseBg} !important`,
          color: `${baseText} !important`,
          opacity: 0.88,
        },
        "&.Mui-disabled": {
          bgcolor: "#f1f1f1 !important",
          color: "#b5b5b5 !important",
          borderColor: "#e5e7eb",
          opacity: 1,
        },
        "&.Mui-selected": {
          bgcolor: "#007D9E !important",
          color: "#FFFFFF !important",
          borderColor: "#FFFFFF",
          "&:hover, &:focus": {
            bgcolor: "#007D9E !important",
            color: "#FFFFFF !important",
          },
        },
      },
    };
  },
  textField: {
    required: true as const,
    fullWidth: true as const,
    size: "small" as const,
    variant: "outlined" as const,
    sx: datePickerTextFieldSx,
    readOnly: false,
    slotProps: {
      htmlInput: { autoComplete: "off" },
    },
  },
};
