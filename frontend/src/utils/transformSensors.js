export function toChartData(sensors) {
  if (!sensors) return [];

  return [
    { key: "seat_front", label: "좌판-앞", value: sensors.seat_front },
    { key: "seat_back", label: "좌판-뒤", value: sensors.seat_back },
    { key: "seat_left", label: "좌판-왼쪽", value: sensors.seat_left },
    { key: "seat_right", label: "좌판-오른쪽", value: sensors.seat_right },
    { key: "back_front", label: "등받이-앞", value: sensors.back_front },
    { key: "back_back", label: "등받이-뒤", value: sensors.back_back },
    { key: "back_left", label: "등받이-왼쪽", value: sensors.back_left },
    { key: "back_right", label: "등받이-오른쪽", value: sensors.back_right },
  ];
}
