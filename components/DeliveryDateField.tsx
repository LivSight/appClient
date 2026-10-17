import { useMemo, useState } from "react";
import { Platform, Pressable, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import AppText from "@/components/AppText";
import SolarIcon from "@/components/SolarIcon";
import {
  formatScheduledDeliveryLabel,
  isoDateFromDateInSchedulingTimezone,
  isScheduledDeliveryToday,
  isScheduledDeliveryTomorrow,
  minimumSelectableDeliveryDate,
  parseIsoDateOnly,
  todayIsoInSchedulingTimezone,
  tomorrowIsoInSchedulingTimezone,
} from "@/lib/scheduling/deliveryDate";
import { colors, fonts, radii } from "@/theme/tokens";

type QuickOption = "today" | "tomorrow" | "other";

type Props = {
  value: string;
  onChange: (iso: string) => void;
  testID?: string;
};

function resolveQuickOption(value: string, now = new Date()): QuickOption {
  if (isScheduledDeliveryToday(value, now)) return "today";
  if (isScheduledDeliveryTomorrow(value, now)) return "tomorrow";
  return "other";
}

function chipStyle(selected: boolean) {
  return {
    flex: 1,
    minWidth: 0,
    minHeight: 40,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: selected ? colors.primary : "#F3F4F5",
    borderWidth: 1,
    borderColor: selected ? colors.primary : "rgba(187,203,184,0.25)",
  };
}

function chipTextStyle(selected: boolean) {
  return {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: selected ? fonts.bodySemi : fonts.bodyMedium,
    color: selected ? colors.white : colors.text,
    textAlign: "center" as const,
  };
}

export default function DeliveryDateField({ value, onChange, testID }: Props) {
  const now = useMemo(() => new Date(), []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const quickOption = resolveQuickOption(value, now);
  const selectedDate = parseIsoDateOnly(value) ?? minimumSelectableDeliveryDate(now);
  const minimumDate = minimumSelectableDeliveryDate(now);
  const todayIso = todayIsoInSchedulingTimezone(now);
  const tomorrowIso = tomorrowIsoInSchedulingTimezone(now);

  const todaySelected = quickOption === "today" && !pickerOpen;
  const tomorrowSelected = quickOption === "tomorrow" && !pickerOpen;
  const otherSelected = quickOption === "other" || pickerOpen;

  const otherLabel = useMemo(() => {
    if (!otherSelected || pickerOpen) return "Autre";
    const label = formatScheduledDeliveryLabel(value, now);
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [otherSelected, pickerOpen, value, now]);

  function handleChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === "android") setPickerOpen(false);
    if (event.type === "dismissed" || !date) return;
    onChange(isoDateFromDateInSchedulingTimezone(date));
  }

  function selectToday() {
    setPickerOpen(false);
    onChange(todayIso);
  }

  function selectTomorrow() {
    setPickerOpen(false);
    onChange(tomorrowIso);
  }

  function selectOther() {
    setPickerOpen(true);
  }

  return (
    <View testID={testID} style={{ gap: 8 }}>
      <AppText
        variant="dense"
        style={{
          fontSize: 13,
          lineHeight: 18,
          fontFamily: fonts.bodySemi,
          color: colors.text,
        }}
        numberOfLines={1}
      >
        Date de livraison
      </AppText>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable
          testID={testID ? `${testID}-today` : undefined}
          onPress={selectToday}
          style={chipStyle(todaySelected)}
        >
          <AppText variant="dense" style={chipTextStyle(todaySelected)} numberOfLines={1}>
            Aujourd&apos;hui
          </AppText>
        </Pressable>

        <Pressable
          testID={testID ? `${testID}-tomorrow` : undefined}
          onPress={selectTomorrow}
          style={chipStyle(tomorrowSelected)}
        >
          <AppText variant="dense" style={chipTextStyle(tomorrowSelected)} numberOfLines={1}>
            Demain
          </AppText>
        </Pressable>

        <Pressable
          testID={testID ? `${testID}-other` : undefined}
          onPress={selectOther}
          style={[chipStyle(otherSelected), { flexDirection: "row", gap: 4 }]}
        >
          {!otherSelected || pickerOpen ? (
            <SolarIcon
              name="solar:calendar-outline"
              size={16}
              color={otherSelected ? colors.white : colors.text}
            />
          ) : null}
          <AppText
            variant="dense"
            style={chipTextStyle(otherSelected)}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {otherLabel}
          </AppText>
        </Pressable>
      </View>

      {pickerOpen ? (
        <View
          style={{
            borderRadius: radii.card,
            backgroundColor: colors.white,
            overflow: "hidden",
            alignSelf: "stretch",
          }}
        >
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            locale="fr-FR"
            minimumDate={minimumDate}
            onChange={handleChange}
            style={Platform.OS === "ios" ? { height: 160 } : undefined}
          />
          {Platform.OS === "ios" ? (
            <Pressable
              onPress={() => setPickerOpen(false)}
              style={{
                paddingVertical: 10,
                alignItems: "center",
                borderTopWidth: 1,
                borderTopColor: "rgba(192,199,210,0.2)",
              }}
            >
              <AppText
                variant="dense"
                style={{ fontSize: 14, lineHeight: 20, fontFamily: fonts.bodySemi, color: colors.primary }}
                numberOfLines={1}
              >
                OK
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
