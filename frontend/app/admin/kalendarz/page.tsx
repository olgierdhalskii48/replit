"use client";

import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Calendar} from "@heroui/react";
import {today, getLocalTimeZone} from "@internationalized/date";

export default function AdminCalendarPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Kalendarz</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Podgląd</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <Calendar isReadOnly aria-label="Date (Read Only)" value={today(getLocalTimeZone())} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
