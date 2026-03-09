"use client"

import { useState } from "react"
import { useTestStore } from "@/lib/test-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Copy, Check } from "lucide-react"

export function CreateTestForm() {
  const { createTest } = useTestStore()
  const [studentName, setStudentName] = useState("")
  const [parentName, setParentName] = useState("")
  const [mobile, setMobile] = useState("")
  const [grade, setGrade] = useState("")
  const [testType, setTestType] = useState("Gen. Test")
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!studentName || !parentName || !mobile || !grade) return
    
    const code = createTest({
      studentName,
      parentName,
      mobile: `+91 ${mobile}`,
      grade: parseInt(grade),
      testType,
    })
    
    setGeneratedCode(code)
    
    // Reset form
    setStudentName("")
    setParentName("")
    setMobile("")
    setGrade("")
  }

  const copyCode = async () => {
    if (generatedCode) {
      await navigator.clipboard.writeText(generatedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Create Test
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="studentName">Full Name</Label>
              <Input
                id="studentName"
                placeholder="Student name"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="parentName">Parent Name</Label>
              <Input
                id="parentName"
                placeholder="Parent name"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile (+91)</Label>
              <Input
                id="mobile"
                placeholder="9876543210"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="grade">Admission for Grade</Label>
              <Select value={grade} onValueChange={setGrade} required>
                <SelectTrigger id="grade">
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((g) => (
                    <SelectItem key={g} value={g.toString()}>
                      Grade {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="testType">Test Type</Label>
              <Select value={testType} onValueChange={setTestType}>
                <SelectTrigger id="testType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Gen. Test">Gen. Test</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button type="submit" className="h-10">
              Generate Test
            </Button>
          </div>
        </form>
        
        {generatedCode && (
          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Generated Code:</span>
            <Badge 
              variant="secondary" 
              className="text-lg px-4 py-1 font-mono bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer"
              onClick={copyCode}
            >
              {generatedCode}
              {copied ? (
                <Check className="ml-2 h-4 w-4" />
              ) : (
                <Copy className="ml-2 h-4 w-4" />
              )}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
