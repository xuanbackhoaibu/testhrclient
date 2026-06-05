import { Group, Text } from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconCalendarEvent } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useMemo } from 'react';
import { useCalendarView } from '../../../features/calendar/useCalendarView';
import type { CalendarEvent } from '../../../features/calendar/useCalendarEvents';
import styles from './CalendarView.module.css';

const EVENT_COLORS: Record<string, string> = {
  MEETING: 'blue',
  TASK: 'green',
  DEADLINE: 'red',
  LEAVE: 'orange',
  REMINDER: 'yellow',
  OTHER: 'gray',
};

interface CalendarViewProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
}

export function CalendarView({ events, onEventClick }: CalendarViewProps) {
  const { year, month, goToPrev, goToNext, goToToday } = useCalendarView();

  const days = useMemo(() => {
    const startOfMonth = dayjs().year(year).month(month).startOf('month');
    const endOfMonth = dayjs().year(year).month(month).endOf('month');
    const startDay = startOfMonth.startOf('week');
    const endDay = endOfMonth.endOf('week');

    const daysArray: dayjs.Dayjs[] = [];
    let current = startDay;
    while (current.isBefore(endDay) || current.isSame(endDay, 'day')) {
      daysArray.push(current);
      current = current.add(1, 'day');
    }
    return daysArray;
  }, [year, month]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      const dayKey = dayjs(event.startAt).format('YYYY-MM-DD');
      const existing = map.get(dayKey) ?? [];
      map.set(dayKey, [...existing, event]);
    });
    return map;
  }, [events]);

  const monthLabel = dayjs().year(year).month(month).format('MMMM YYYY');

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <Group gap="xs">
          <IconCalendarEvent size={20} />
          <Text fw={600}>{monthLabel}</Text>
        </Group>
        <Group gap="xs">
          <IconChevronLeft
            size={20}
            style={{ cursor: 'pointer' }}
            onClick={goToPrev}
          />
          <Text
            size="sm"
            fw={500}
            style={{ cursor: 'pointer', minWidth: 60, textAlign: 'center' }}
            onClick={goToToday}
          >
            Hôm nay
          </Text>
          <IconChevronRight
            size={20}
            style={{ cursor: 'pointer' }}
            onClick={goToNext}
          />
        </Group>
      </div>

      {/* Day headers */}
      <div className={styles.dayHeaders}>
        {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((day) => (
          <div key={day} className={styles.dayHeader}>
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className={styles.daysGrid}>
        {days.map((day, index) => {
          const isCurrentMonth = day.month() === month;
          const isToday = day.isSame(dayjs(), 'day');
          const dayKey = day.format('YYYY-MM-DD');
          const dayEvents = eventsByDay.get(dayKey) ?? [];

          return (
            <div
              key={index}
              className={`${styles.dayCell} ${!isCurrentMonth ? styles.otherMonth : ''} ${isToday ? styles.today : ''}`}
            >
              <div className={styles.dayNumber}>{day.format('D')}</div>
              <div className={styles.eventsContainer}>
                {dayEvents.slice(0, 3).map((event) => {
                  const invited = event.isParticipant && !event.canEdit;
                  return (
                    <div
                      key={event.id}
                      className={styles.eventPill}
                      style={{
                        backgroundColor: `var(--mantine-color-${EVENT_COLORS[event.eventType] ?? 'gray'}-1)`,
                        borderLeftColor: `var(--mantine-color-${EVENT_COLORS[event.eventType] ?? 'gray'}-6)`,
                      }}
                      onClick={() => onEventClick?.(event)}
                      title={invited ? `${event.title} (Được mời)` : event.title}
                    >
                      {invited && (
                        <span style={{ color: 'var(--mantine-color-grape-6)', marginRight: 4 }}>
                          ●
                        </span>
                      )}
                      {event.title}
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <Text size="xs" c="dimmed" className={styles.moreEvents}>
                    +{dayEvents.length - 3} sự kiện khác
                  </Text>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
