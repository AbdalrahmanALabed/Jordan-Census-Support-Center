"use client";



import { useState } from "react";

import { Eye } from "lucide-react";

import { Button } from "@/components/ui/button";

import {

  ReportClassifyDialog,

  canReviewReport,

} from "@/components/reports/report-classify-dialog";

import type { FieldReport } from "@/lib/reports";



interface ReportQuickActionsProps {

  report: FieldReport;

  compact?: boolean;

  /** يعرض التفاصيل الكاملة أولاً (شاشة البلاغات الواردة) */

  startAtReview?: boolean;

  onConfirmed?: () => void;

  onNotProblem?: () => void;

}



export function ReportQuickActions({

  report,

  compact = false,

  startAtReview = false,

}: ReportQuickActionsProps) {

  const [open, setOpen] = useState(false);



  if (!canReviewReport(report)) return null;



  return (

    <>

      <Button

        size={compact ? "sm" : "default"}

        className="gap-1"

        onClick={(e) => {

          e.stopPropagation();

          setOpen(true);

        }}

      >

        <Eye className="h-3.5 w-3.5" />

        {startAtReview ? "مراجعة" : "تصنيف"}

      </Button>

      <ReportClassifyDialog

        report={report}

        open={open}

        onOpenChange={setOpen}

        startAtReview={startAtReview}

      />

    </>

  );

}

