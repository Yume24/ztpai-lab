const toMs = value => (typeof value === "number" ? value : new Date(value).getTime());

// Przedziały są półotwarte [startTime, endTime), więc przedziały stykające się (koniec jednego
// jest początkiem drugiego) nie nachodzą na siebie. Tak samo działa zapytanie w KnexReservationsRepository
// (start_time < to AND end_time > from) i constraint reservations_no_overlap (tstzrange '[)').
export function overlaps(a, b) {
    return toMs(a.startTime) <= toMs(b.endTime) && toMs(b.startTime) < toMs(a.endTime);
}
