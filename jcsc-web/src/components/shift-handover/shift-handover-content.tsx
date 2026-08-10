"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, AlertTriangle, FolderOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getShiftHandoversExtended, submitShiftHandover } from "@/lib/services/cases";
import { mockUsers } from "@/lib/mock-data";
import { useUserStore } from "@/stores/user-store";
import { formatDate } from "@/lib/utils";

export function ShiftHandoverContent() {
  const queryClient = useQueryClient();
  const { currentUser } = useUserStore();
  const [notes, setNotes] = useState("");
  const [toUserId, setToUserId] = useState("");

  const { data: handovers, isLoading } = useQuery({
    queryKey: ["shift-handovers-ext"],
    queryFn: getShiftHandoversExtended,
  });

  const mutation = useMutation({
    mutationFn: () => {
      const toUser = mockUsers.find((u) => u.id === toUserId);
      return submitShiftHandover({
        fromUserId: currentUser?.id ?? "",
        fromUserName: currentUser?.name ?? "",
        toUserId,
        toUserName: toUser?.name ?? "",
        notes,
        openCases: 8,
        criticalCases: 2,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shift-handovers-ext"] });
      setNotes("");
    },
  });

  const colleagues = mockUsers.filter(
    (u) => u.isActive && u.id !== currentUser?.id && u.role !== "SUPERVISOR"
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>تسليم وردية جديد</CardTitle>
          <p className="text-sm text-muted-foreground">
            لخّص ما حدث — يُرسل بريد تلقائي للزميل ويُحفظ في السجل
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={toUserId} onValueChange={setToUserId}>
            <SelectTrigger><SelectValue placeholder="إلى زميل..." /></SelectTrigger>
            <SelectContent>
              {colleagues.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name} — {u.team}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="مثال: 3 حالات حرجة، مستخدمون في إربد يواجهون مشاكل مزامنة..."
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Button
            disabled={!notes.trim() || !toUserId || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "جاري التسليم..." : "تسليم الوردية"}
          </Button>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5" />
          سجل التسليم
        </h2>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">جاري التحميل...</p>
        ) : (
          <div className="space-y-4">
            {handovers?.map((h) => (
              <Card key={h.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{h.fromUserName} ← {h.toUserName}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {h.shiftDate} · {formatDate(h.createdAt)}
                      </p>
                    </div>
                    <Badge variant="outline">{h.summary}</Badge>
                  </div>
                  <div className="mt-3 flex gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <FolderOpen className="h-3 w-3" />
                      {h.openCases ?? h.openTickets} حالات
                    </span>
                    <span className="flex items-center gap-1 text-red-500">
                      <AlertTriangle className="h-3 w-3" />
                      {h.criticalTickets} حرجة
                    </span>
                  </div>
                  {h.notes && (
                    <p className="mt-3 text-sm text-muted-foreground border-t pt-3">{h.notes}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
