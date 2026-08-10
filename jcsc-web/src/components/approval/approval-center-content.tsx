"use client";



import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import Link from "next/link";

import { ShieldCheck, CheckCircle, ClipboardCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";

import { getAwaitingApprovalCases, approveCaseAsBug } from "@/lib/services/cases";

import { CASE_TYPE_LABELS } from "@/lib/cases";

import { useUserStore } from "@/stores/user-store";



export function ApprovalCenterContent() {

  const queryClient = useQueryClient();

  const { currentUser } = useUserStore();



  const { data: pendingCases } = useQuery({

    queryKey: ["approval-cases"],

    queryFn: getAwaitingApprovalCases,

  });



  const approveMutation = useMutation({

    mutationFn: (caseId: string) => approveCaseAsBug(caseId, currentUser?.name ?? "مدير"),

    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["approval-cases"] }),

  });



  return (

    <div className="space-y-6">

      <p className="text-sm text-muted-foreground">

        مركز موافقات السوبر أدمن — تظهر هنا فقط الحالات المُصعّدة كـ System Bug من منسق الدعم.

        البلاغات الجديدة (OPEN) تبقى عند منسق الدعم للتصنيف أولاً.

      </p>



      <Card className="border-2 border-sky-200/60 bg-sky-50/40 dark:bg-sky-950/20">

        <CardContent className="flex flex-wrap items-center gap-4 p-5">

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-500/15">

            <ClipboardCheck className="h-6 w-6 text-sky-600" />

          </div>

          <div className="flex-1 min-w-[200px]">

            <p className="font-black">بلاغات بانتظار منسق الدعم</p>

            <p className="text-sm text-muted-foreground mt-1">

              البلاغات الواردة من المشرفين أو المنسقين تُصنَّف أولاً — لا تظهر هنا حتى يُصعَّد System Bug

            </p>

          </div>

          <Button asChild variant="outline" className="font-bold border-2 shrink-0">

            <Link href="/cases?status=OPEN">عرض قائمة التصنيف (للاطلاع)</Link>

          </Button>

        </CardContent>

      </Card>



      <Card>

        <CardHeader>

          <CardTitle className="flex items-center gap-2 text-base">

            <ShieldCheck className="h-4 w-4" /> System Bug — بانتظار الموافقة والإسناد

          </CardTitle>

        </CardHeader>

        <CardContent className="space-y-3">

          {!pendingCases?.length ? (

            <p className="text-sm text-muted-foreground">

              لا حالات مُصعّدة — منسق الدعم لم يرسل System Bug بعد

            </p>

          ) : (

            pendingCases.map((c) => (

              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">

                <div>

                  <Link href={`/cases/${c.id}`} className="text-xs text-primary hover:underline">{c.number}</Link>

                  <p className="font-medium text-sm">{c.title}</p>

                  <div className="flex gap-1 mt-1">

                    <Badge variant="outline">{CASE_TYPE_LABELS[c.caseType]}</Badge>

                  </div>

                </div>

                <Button size="sm" className="gap-1" onClick={() => approveMutation.mutate(c.id)}>

                  <CheckCircle className="h-3 w-3" /> موافقة كخلل

                </Button>

              </div>

            ))

          )}

        </CardContent>

      </Card>

    </div>

  );

}

