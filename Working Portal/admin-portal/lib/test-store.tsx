"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

export type TestStatus = "Created" | "Started" | "Finished"

export interface Test {
  id: string
  testCode: string
  studentName: string
  parentName: string
  mobile: string
  grade: number
  testType: string
  status: TestStatus
  tabSwitchCount: number
  startTime?: Date
  endTime?: Date
  score?: number
  subjectScores?: {
    english: number
    mathematics: number
    evs: number
  }
  createdAt: Date
}

export interface TabSwitchEvent {
  id: string
  testCode: string
  studentName: string
  count: number
  timestamp: Date
}

interface TestStoreContextType {
  tests: Test[]
  tabSwitchEvents: TabSwitchEvent[]
  createTest: (data: Omit<Test, "id" | "testCode" | "status" | "tabSwitchCount" | "createdAt">) => string
  updateTestStatus: (testCode: string, status: TestStatus) => void
  recordTabSwitch: (testCode: string) => void
  clearTabSwitchEvents: () => void
  getActiveTests: () => Test[]
  getCompletedTests: () => Test[]
  getTodayCompletedTests: () => Test[]
}

const TestStoreContext = createContext<TestStoreContextType | undefined>(undefined)

function generateTestCode(): string {
  return Math.floor(100000000 + Math.random() * 900000000).toString()
}

// Initial mock data
const initialTests: Test[] = [
  {
    id: "1",
    testCode: "123456789",
    studentName: "Rohan Sharma",
    parentName: "Rajesh Sharma",
    mobile: "+91 9876543210",
    grade: 5,
    testType: "Gen. Test",
    status: "Started",
    tabSwitchCount: 2,
    startTime: new Date(Date.now() - 30 * 60000),
    createdAt: new Date(Date.now() - 60 * 60000),
  },
  {
    id: "2",
    testCode: "987654321",
    studentName: "Priya Patel",
    parentName: "Amit Patel",
    mobile: "+91 9876543211",
    grade: 7,
    testType: "Gen. Test",
    status: "Created",
    tabSwitchCount: 0,
    createdAt: new Date(Date.now() - 45 * 60000),
  },
  {
    id: "3",
    testCode: "456789123",
    studentName: "Arjun Singh",
    parentName: "Vikram Singh",
    mobile: "+91 9876543212",
    grade: 4,
    testType: "Gen. Test",
    status: "Started",
    tabSwitchCount: 0,
    startTime: new Date(Date.now() - 20 * 60000),
    createdAt: new Date(Date.now() - 50 * 60000),
  },
  {
    id: "4",
    testCode: "789123456",
    studentName: "Ananya Gupta",
    parentName: "Suresh Gupta",
    mobile: "+91 9876543213",
    grade: 6,
    testType: "Gen. Test",
    status: "Finished",
    tabSwitchCount: 1,
    startTime: new Date(Date.now() - 120 * 60000),
    endTime: new Date(Date.now() - 60 * 60000),
    score: 85,
    subjectScores: { english: 28, mathematics: 30, evs: 27 },
    createdAt: new Date(Date.now() - 150 * 60000),
  },
  {
    id: "5",
    testCode: "321654987",
    studentName: "Kavya Reddy",
    parentName: "Mohan Reddy",
    mobile: "+91 9876543214",
    grade: 8,
    testType: "Gen. Test",
    status: "Finished",
    tabSwitchCount: 0,
    startTime: new Date(Date.now() - 180 * 60000),
    endTime: new Date(Date.now() - 120 * 60000),
    score: 92,
    subjectScores: { english: 30, mathematics: 32, evs: 30 },
    createdAt: new Date(Date.now() - 200 * 60000),
  },
]

export function TestStoreProvider({ children }: { children: ReactNode }) {
  const [tests, setTests] = useState<Test[]>(initialTests)
  const [tabSwitchEvents, setTabSwitchEvents] = useState<TabSwitchEvent[]>([
    {
      id: "evt1",
      testCode: "123456789",
      studentName: "Rohan Sharma",
      count: 2,
      timestamp: new Date(Date.now() - 5 * 60000),
    }
  ])

  const createTest = useCallback((data: Omit<Test, "id" | "testCode" | "status" | "tabSwitchCount" | "createdAt">) => {
    const testCode = generateTestCode()
    const newTest: Test = {
      ...data,
      id: Date.now().toString(),
      testCode,
      status: "Created",
      tabSwitchCount: 0,
      createdAt: new Date(),
    }
    setTests(prev => [newTest, ...prev])
    return testCode
  }, [])

  const updateTestStatus = useCallback((testCode: string, status: TestStatus) => {
    setTests(prev => prev.map(test => {
      if (test.testCode === testCode) {
        const updates: Partial<Test> = { status }
        if (status === "Started" && !test.startTime) {
          updates.startTime = new Date()
        }
        if (status === "Finished") {
          updates.endTime = new Date()
          updates.score = Math.floor(70 + Math.random() * 30)
          updates.subjectScores = {
            english: Math.floor(20 + Math.random() * 15),
            mathematics: Math.floor(20 + Math.random() * 15),
            evs: Math.floor(20 + Math.random() * 15),
          }
        }
        return { ...test, ...updates }
      }
      return test
    }))
  }, [])

  const recordTabSwitch = useCallback((testCode: string) => {
    setTests(prev => prev.map(test => {
      if (test.testCode === testCode) {
        return { ...test, tabSwitchCount: test.tabSwitchCount + 1 }
      }
      return test
    }))
    
    const test = tests.find(t => t.testCode === testCode)
    if (test) {
      const newEvent: TabSwitchEvent = {
        id: Date.now().toString(),
        testCode,
        studentName: test.studentName,
        count: test.tabSwitchCount + 1,
        timestamp: new Date(),
      }
      setTabSwitchEvents(prev => [newEvent, ...prev])
    }
  }, [tests])

  const clearTabSwitchEvents = useCallback(() => {
    setTabSwitchEvents([])
  }, [])

  const getActiveTests = useCallback(() => {
    return tests.filter(t => t.status !== "Finished")
  }, [tests])

  const getCompletedTests = useCallback(() => {
    return tests.filter(t => t.status === "Finished")
  }, [tests])

  const getTodayCompletedTests = useCallback(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return tests.filter(t => 
      t.status === "Finished" && 
      t.endTime && 
      new Date(t.endTime) >= today
    )
  }, [tests])

  return (
    <TestStoreContext.Provider value={{
      tests,
      tabSwitchEvents,
      createTest,
      updateTestStatus,
      recordTabSwitch,
      clearTabSwitchEvents,
      getActiveTests,
      getCompletedTests,
      getTodayCompletedTests,
    }}>
      {children}
    </TestStoreContext.Provider>
  )
}

export function useTestStore() {
  const context = useContext(TestStoreContext)
  if (context === undefined) {
    throw new Error("useTestStore must be used within a TestStoreProvider")
  }
  return context
}
