"use client"

import { useTestStore } from "@/lib/test-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { History } from "lucide-react"

export function TestHistoryTable() {
  const { getTodayCompletedTests } = useTestStore()
  const completedTests = getTodayCompletedTests()

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <History className="h-5 w-5" />
          Test History (Today)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-16">S.No</TableHead>
                <TableHead>Test Code</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>Parent Name</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead className="w-20">Grade</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead className="w-20 text-right">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {completedTests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    No completed tests today
                  </TableCell>
                </TableRow>
              ) : (
                completedTests.map((test, index) => (
                  <TableRow key={test.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-mono">{test.testCode}</TableCell>
                    <TableCell>{test.studentName}</TableCell>
                    <TableCell>{test.parentName}</TableCell>
                    <TableCell className="font-mono text-sm">{test.mobile}</TableCell>
                    <TableCell>{test.grade}</TableCell>
                    <TableCell>{formatTime(test.startTime)}</TableCell>
                    <TableCell>{formatTime(test.endTime)}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      {test.score}/100
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function formatTime(date?: Date): string {
  if (!date) return "-"
  return new Date(date).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  })
}
