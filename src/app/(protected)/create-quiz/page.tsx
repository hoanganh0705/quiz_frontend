'use client'

import { memo, useMemo, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { Plus, Eye, Trash2, Save, Upload, Copy, Pencil } from 'lucide-react'
import QuizDetailsTab from '@/components/create-quiz/QuizDetailsTab'
import QuestionsTab from '@/components/create-quiz/QuestionsTab'
import SettingsTab from '@/components/create-quiz/SettingsTab'
import { useLocalStorage } from '@/hooks'

interface QuizEditorState {
  title: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  tags: string[]
  questionCount: number
  settings: {
    timeLimit: string
    timePerQuestion: string
    randomizeQuestions: boolean
    showExplanations: boolean
    allowRetakes: boolean
    passingScore: number
    visibility: 'private' | 'public' | 'unlisted'
  }
}

interface StoredQuiz extends QuizEditorState {
  id: string
  status: 'draft' | 'published'
  updatedAt: string
  analytics: {
    plays: number
    rating: number
    completionRate: number
  }
}

const defaultEditorState: QuizEditorState = {
  title: '',
  description: '',
  difficulty: 'medium',
  tags: [],
  questionCount: 1,
  settings: {
    timeLimit: 'no-limit',
    timePerQuestion: 'no-limit-per-question',
    randomizeQuestions: false,
    showExplanations: true,
    allowRetakes: true,
    passingScore: 70,
    visibility: 'private'
  }
}

const QuizForm = memo(function QuizForm() {
  const [activeTab, setActiveTab] = useState('quiz-details')
  const [listTab, setListTab] = useState<'draft' | 'published'>('draft')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editorState, setEditorState] =
    useState<QuizEditorState>(defaultEditorState)

  const [storedQuizzes, setStoredQuizzes] = useLocalStorage<StoredQuiz[]>(
    'my_quizzes_v1',
    []
  )

  const completion = useMemo(() => {
    const detailsCompleted =
      editorState.title.trim().length > 2 &&
      editorState.description.trim().length > 10
    const questionsCompleted = editorState.questionCount > 0
    const settingsCompleted =
      editorState.settings.timeLimit.length > 0 &&
      editorState.settings.visibility.length > 0

    const completedSections = [
      detailsCompleted,
      questionsCompleted,
      settingsCompleted
    ].filter(Boolean).length

    return Math.round((completedSections / 3) * 100)
  }, [editorState])

  const visibleQuizzes = useMemo(
    () =>
      storedQuizzes
        .filter((quiz) => quiz.status === listTab)
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        ),
    [listTab, storedQuizzes]
  )

  const resetEditor = () => {
    setEditingId(null)
    setEditorState(defaultEditorState)
    setActiveTab('quiz-details')
  }

  const upsertQuiz = (status: 'draft' | 'published') => {
    setStoredQuizzes((prev) => {
      const now = new Date().toISOString()
      const analytics = prev.find((quiz) => quiz.id === editingId)
        ?.analytics ?? {
        plays: Math.floor(Math.random() * 200),
        rating: Number((3 + Math.random() * 2).toFixed(1)),
        completionRate: Math.floor(60 + Math.random() * 35)
      }

      const nextQuiz: StoredQuiz = {
        id: editingId ?? `quiz-${Date.now()}`,
        ...editorState,
        status,
        updatedAt: now,
        analytics
      }

      const existingIndex = prev.findIndex((quiz) => quiz.id === nextQuiz.id)
      if (existingIndex >= 0) {
        const copy = [...prev]
        copy[existingIndex] = nextQuiz
        return copy
      }
      return [nextQuiz, ...prev]
    })
  }

  const loadQuizForEdit = (quiz: StoredQuiz) => {
    setEditingId(quiz.id)
    setEditorState({
      title: quiz.title,
      description: quiz.description,
      difficulty: quiz.difficulty,
      tags: quiz.tags,
      questionCount: quiz.questionCount,
      settings: quiz.settings
    })
    setActiveTab('quiz-details')
  }

  const duplicateQuiz = (quiz: StoredQuiz) => {
    setStoredQuizzes((prev) => [
      {
        ...quiz,
        id: `quiz-${Date.now()}`,
        title: `${quiz.title} (Copy)`,
        status: 'draft',
        updatedAt: new Date().toISOString()
      },
      ...prev
    ])
  }

  const deleteQuiz = (id: string) => {
    setStoredQuizzes((prev) => prev.filter((quiz) => quiz.id !== id))
    if (editingId === id) {
      resetEditor()
    }
  }

  return (
    <div className='min-h-screen w-full text-foreground p-4 md:p-6 bg-background'>
      <div className='mb-5 border border-border rounded-lg p-4 bg-main/20'>
        <div className='flex items-center justify-between mb-2'>
          <p className='text-sm font-semibold'>Quiz creation progress</p>
          <p className='text-sm text-foreground/70'>{completion}%</p>
        </div>
        <Progress value={completion} className='h-2' />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
        <TabsList className='grid w-full grid-cols-3 bg-[#f5f5f5] dark:bg-main'>
          <TabsTrigger
            value='quiz-details'
            className='text-sm font-semibold dark:data-[state=active]:bg-default dark:dark:data-[state=active]:text-white data-[state=active]:bg-background text-foreground/70 data-[state=active]:text-foreground transition-transform'
          >
            Quiz Details
          </TabsTrigger>
          <TabsTrigger
            value='questions'
            className='text-sm font-semibold dark:data-[state=active]:bg-default  dark:data-[state=active]:text-white data-[state=active]:bg-background text-foreground/70 data-[state=active]:text-foreground transition-transform'
          >
            Questions
          </TabsTrigger>
          <TabsTrigger
            value='settings'
            className='text-sm font-semibold dark:data-[state=active]:bg-default  dark:data-[state=active]:text-white data-[state=active]:bg-background text-foreground/70 data-[state=active]:text-foreground transition-transform'
          >
            Settings
          </TabsTrigger>
        </TabsList>

        <div className='mt-10 bg-white dark:bg-transparent'>
          <TabsContent value='quiz-details'>
            <QuizDetailsTab
              values={{
                title: editorState.title,
                description: editorState.description,
                difficulty: editorState.difficulty,
                tags: editorState.tags
              }}
              onChange={(next) =>
                setEditorState((prev) => ({
                  ...prev,
                  ...next
                }))
              }
            />
          </TabsContent>

          <TabsContent value='questions'>
            <QuestionsTab
              initialCount={editorState.questionCount}
              onQuestionsCountChange={(count) =>
                setEditorState((prev) => ({ ...prev, questionCount: count }))
              }
            />
          </TabsContent>

          <TabsContent value='settings'>
            <SettingsTab
              values={editorState.settings}
              onChange={(next) =>
                setEditorState((prev) => ({
                  ...prev,
                  settings: { ...prev.settings, ...next }
                }))
              }
            />
          </TabsContent>
        </div>
      </Tabs>

      <hr className='my-6' />

      <div
        className='flex flex-col sm:flex-row items-center justify-between p-6 bg-transparent gap-4 text-foreground'
        role='toolbar'
        aria-label='Quiz actions'
      >
        <div className='flex flex-wrap gap-3'>
          <Button
            className='bg-transparent hover:bg-main-hover border border-border text-foreground px-4 py-2 rounded-md'
            onClick={resetEditor}
            aria-label='Create new quiz'
          >
            <Plus className='w-4 h-4 mr-2' aria-hidden='true' />
            New Quiz
          </Button>
          <Button
            className='bg-transparent hover:bg-main-hover border border-border text-foreground px-4 py-2 rounded-md'
            aria-label='Preview quiz'
          >
            <Eye className='w-4 h-4 mr-2' aria-hidden='true' />
            Preview
          </Button>
        </div>
        <div className='flex flex-wrap gap-3'>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                className='dark:bg-[#7F1D1D] bg-[#ef4444] hover:bg-[#b91c1c] text-white px-4 py-2 rounded-md border border-border'
                aria-label='Delete quiz'
              >
                <Trash2 className='w-4 h-4 mr-2' aria-hidden='true' />
                Delete Quiz
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete current draft?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes the currently edited quiz from local drafts.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (editingId) deleteQuiz(editingId)
                    resetEditor()
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            className='bg-transparent hover:bg-main-hover text-foreground px-4 py-2 rounded-md border border-border'
            aria-label='Save draft'
            onClick={() => upsertQuiz('draft')}
          >
            <Save className='w-4 h-4 mr-2' aria-hidden='true' />
            Save Draft
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                className='bg-default hover:bg-default-hover text-white px-4 py-2 rounded-md border border-border'
                aria-label='Publish quiz'
              >
                <Upload className='w-4 h-4 mr-2' aria-hidden='true' />
                Publish Quiz
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Publish this quiz?</AlertDialogTitle>
                <AlertDialogDescription>
                  You can still edit and republish later from My Quizzes.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => upsertQuiz('published')}>
                  Publish
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <section className='mt-8'>
        <h2 className='text-xl font-bold mb-4'>My Quizzes</h2>

        <Tabs
          value={listTab}
          onValueChange={(value) => setListTab(value as 'draft' | 'published')}
        >
          <TabsList className='mb-4'>
            <TabsTrigger value='draft'>Drafts</TabsTrigger>
            <TabsTrigger value='published'>Published</TabsTrigger>
          </TabsList>

          <TabsContent value='draft' className='space-y-3'>
            {visibleQuizzes.length === 0 ? (
              <p className='text-sm text-foreground/60'>
                No draft quizzes yet.
              </p>
            ) : (
              visibleQuizzes.map((quiz) => (
                <QuizManagementCard
                  key={quiz.id}
                  quiz={quiz}
                  onEdit={() => loadQuizForEdit(quiz)}
                  onDuplicate={() => duplicateQuiz(quiz)}
                  onDelete={() => deleteQuiz(quiz.id)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value='published' className='space-y-3'>
            {visibleQuizzes.length === 0 ? (
              <p className='text-sm text-foreground/60'>
                No published quizzes yet.
              </p>
            ) : (
              visibleQuizzes.map((quiz) => (
                <QuizManagementCard
                  key={quiz.id}
                  quiz={quiz}
                  onEdit={() => loadQuizForEdit(quiz)}
                  onDuplicate={() => duplicateQuiz(quiz)}
                  onDelete={() => deleteQuiz(quiz.id)}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </section>
    </div>
  )
})

function QuizManagementCard({
  quiz,
  onEdit,
  onDuplicate,
  onDelete
}: {
  quiz: StoredQuiz
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  return (
    <Card>
      <CardContent className='p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4'>
        <div className='space-y-1'>
          <div className='flex items-center gap-2'>
            <p className='font-semibold'>{quiz.title || 'Untitled Quiz'}</p>
            <Badge variant='outline' className='capitalize'>
              {quiz.status}
            </Badge>
          </div>
          <p className='text-sm text-foreground/70 line-clamp-2'>
            {quiz.description || 'No description'}
          </p>
          <p className='text-xs text-foreground/60'>
            Updated {new Date(quiz.updatedAt).toLocaleString()}
          </p>
          <div className='flex flex-wrap gap-2 text-xs text-foreground/70'>
            <span>Plays: {quiz.analytics.plays}</span>
            <span>Rating: {quiz.analytics.rating}</span>
            <span>Completion: {quiz.analytics.completionRate}%</span>
          </div>
        </div>

        <div className='flex flex-wrap gap-2'>
          <Button size='sm' variant='outline' onClick={onEdit}>
            <Pencil className='w-4 h-4 mr-1' />
            Edit
          </Button>
          <Button size='sm' variant='outline' onClick={onDuplicate}>
            <Copy className='w-4 h-4 mr-1' />
            Duplicate
          </Button>
          <Button size='sm' variant='outline' onClick={onDelete}>
            <Trash2 className='w-4 h-4 mr-1' />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default QuizForm
