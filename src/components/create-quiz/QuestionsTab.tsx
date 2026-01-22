'use client'

import { useState, useCallback } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
import { Plus, Eye, Trash2, Copy, AlertCircle } from 'lucide-react'

interface Question {
  id: string
  title: string
  text: string
  options: string[]
  correctAnswer: number
  explanation: string
}

interface ValidationErrors {
  [questionId: string]: {
    text?: string
    options?: string[]
    general?: string
  }
}

export default function QuestionsTab() {
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: '1',
      title: 'Question 1',
      text: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: ''
    }
  ])
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({})

  // Validation function for a single question
  const validateQuestion = useCallback((question: Question) => {
    const questionErrors: ValidationErrors[string] = {}

    // Validate question text
    if (!question.text.trim()) {
      questionErrors.text = 'Question text is required'
    } else if (question.text.trim().length < 10) {
      questionErrors.text = 'Question must be at least 10 characters'
    }

    // Validate options
    const optionErrors: string[] = []
    const filledOptions = question.options.filter((opt) => opt.trim() !== '')

    question.options.forEach((option, index) => {
      if (!option.trim()) {
        optionErrors[index] = 'Option is required'
      } else if (option.trim().length < 1) {
        optionErrors[index] = 'Option cannot be empty'
      }
    })

    if (filledOptions.length < 2) {
      questionErrors.general = 'At least 2 options are required'
    }

    // Check for duplicate options
    const uniqueOptions = new Set(
      filledOptions.map((opt) => opt.trim().toLowerCase())
    )
    if (uniqueOptions.size !== filledOptions.length) {
      questionErrors.general = 'Options must be unique'
    }

    if (optionErrors.some((e) => e)) {
      questionErrors.options = optionErrors
    }

    return questionErrors
  }, [])

  // Validate all questions
  const validateAllQuestions = useCallback(() => {
    const allErrors: ValidationErrors = {}
    let isValid = true

    questions.forEach((question) => {
      const questionErrors = validateQuestion(question)
      if (Object.keys(questionErrors).length > 0) {
        allErrors[question.id] = questionErrors
        isValid = false
      }
    })

    setErrors(allErrors)
    return isValid
  }, [questions, validateQuestion])

  // Mark field as touched on blur
  const handleBlur = (questionId: string, field: string) => {
    setTouched((prev) => ({ ...prev, [`${questionId}-${field}`]: true }))

    // Validate the specific question when field is blurred
    const question = questions.find((q) => q.id === questionId)
    if (question) {
      const questionErrors = validateQuestion(question)
      setErrors((prev) => ({
        ...prev,
        [questionId]: questionErrors
      }))
    }
  }

  const addQuestion = () => {
    const newQuestion: Question = {
      id: (questions.length + 1).toString(),
      title: `Question ${questions.length + 1}`,
      text: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: ''
    }
    setQuestions([...questions, newQuestion])
  }

  const duplicateQuestion = (questionId: string) => {
    const questionToDuplicate = questions.find((q) => q.id === questionId)
    if (questionToDuplicate) {
      const newQuestion: Question = {
        ...questionToDuplicate,
        id: (questions.length + 1).toString(),
        title: `Question ${questions.length + 1}`
      }
      setQuestions([...questions, newQuestion])
    }
  }

  const deleteQuestion = (questionId: string) => {
    if (questions.length > 1) {
      const updatedQuestions = questions.filter((q) => q.id !== questionId)
      // Re-number the remaining questions
      const reNumberedQuestions = updatedQuestions.map((q, index) => ({
        ...q,
        id: (index + 1).toString(),
        title: `Question ${index + 1}`
      }))
      setQuestions(reNumberedQuestions)
      // Clear errors for deleted question
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[questionId]
        return newErrors
      })
    }
  }

  const updateQuestion = (
    questionId: string,
    field: keyof Question,
    value: string | number
  ) => {
    setQuestions(
      questions.map((q) => (q.id === questionId ? { ...q, [field]: value } : q))
    )
  }

  const updateOption = (
    questionId: string,
    optionIndex: number,
    value: string
  ) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          const newOptions = [...q.options]
          newOptions[optionIndex] = value
          return { ...q, options: newOptions }
        }
        return q
      })
    )
  }

  const setCorrectAnswer = (questionId: string, correctIndex: number) => {
    updateQuestion(questionId, 'correctAnswer', correctIndex)
  }

  const [previewMode, setPreviewMode] = useState<string | null>(null)

  const togglePreview = (questionId: string) => {
    setPreviewMode(previewMode === questionId ? null : questionId)
  }

  // Get validation status for a question
  const getQuestionStatus = (questionId: string) => {
    const question = questions.find((q) => q.id === questionId)
    if (!question) return 'empty'

    const hasContent = question.text.trim() !== ''
    const hasOptions = question.options.some((opt) => opt.trim() !== '')
    const hasErrors =
      errors[questionId] && Object.keys(errors[questionId]).length > 0

    if (hasErrors) return 'error'
    if (hasContent && hasOptions) return 'complete'
    return 'incomplete'
  }

  // Export validation function for parent component
  const handleValidateAndSave = () => {
    const isValid = validateAllQuestions()
    if (isValid) {
      return questions
    } else {
      return null
    }
  }

  return (
    <div className='rounded-xl'>
      <div className='flex items-center justify-between mb-3'>
        <div className='flex items-center gap-3'>
          <h2 className='text-xl font-bold text-foreground'>Questions</h2>
          <Badge variant='secondary' className='text-foreground/70'>
            {questions.length}{' '}
            {questions.length === 1 ? 'question' : 'questions'}
          </Badge>
        </div>
        <div className='flex gap-2'>
          <Button
            onClick={handleValidateAndSave}
            variant='outline'
            className='border-gray-300 dark:border-slate-700 text-foreground'
          >
            Validate All
          </Button>
          <Button
            onClick={addQuestion}
            className='bg-default hover:bg-default-hover text-white px-4 py-2 rounded-md'
          >
            <Plus className='w-4 h-4 mr-2' />
            Add Question
          </Button>
        </div>
      </div>

      <Accordion type='single' collapsible className='w-full'>
        {questions.map((question) => {
          const status = getQuestionStatus(question.id)
          const questionErrors = errors[question.id]

          return (
            <AccordionItem key={question.id} value={question.id} className=' '>
              <AccordionTrigger className=''>
                <div className='flex items-center justify-between w-full mr-4'>
                  <div className='flex items-center gap-3'>
                    {/* Status indicator */}
                    <div
                      className={`w-2 h-2 rounded-full ${
                        status === 'complete'
                          ? 'bg-green-500'
                          : status === 'error'
                            ? 'bg-red-500'
                            : 'bg-gray-400'
                      }`}
                    />
                    <h3 className='text-base font-semibold text-foreground'>
                      {question.title}
                    </h3>
                    {question.text && (
                      <span className='text-sm text-muted-foreground truncate max-w-md'>
                        {question.text}
                      </span>
                    )}
                    {status === 'error' && (
                      <AlertCircle className='w-4 h-4 text-red-500' />
                    )}
                  </div>
                  <div className='flex items-center gap-2'>
                    <Button
                      size='sm'
                      onClick={(e) => {
                        e.stopPropagation()
                        duplicateQuestion(question.id)
                      }}
                      className='text-white '
                      title='Duplicate question'
                    >
                      <Copy className='w-4 h-4' />
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={(e) => {
                        e.stopPropagation()
                        togglePreview(question.id)
                      }}
                      className={`text-white hover:bg-default-hover hover:text-white ${
                        previewMode === question.id
                          ? 'bg-default/80 dark:bg-slate-800'
                          : ''
                      }`}
                      title='Preview question'
                    >
                      <Eye className='w-4 h-4' />
                    </Button>
                    <Button
                      size='sm'
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteQuestion(question.id)
                      }}
                      className='text-red-600 bg-transparent hover:text-red-400 shadow-none hover:bg-transparent'
                      disabled={questions.length === 1}
                      title='Delete question'
                    >
                      <Trash2 className='w-4 h-4' />
                    </Button>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent>
                {/* General error message */}
                {questionErrors?.general && (
                  <div className='mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md'>
                    <p className='text-red-600 dark:text-red-400 text-sm flex items-center gap-2'>
                      <AlertCircle className='w-4 h-4' />
                      {questionErrors.general}
                    </p>
                  </div>
                )}

                {previewMode === question.id ? (
                  <Card className='bg-gray-50 dark:bg-slate-800/50'>
                    <CardContent className='p-4 space-y-4'>
                      <h4 className='text-lg font-medium'>Preview Mode</h4>
                      {question.text && (
                        <div className='text-foreground'>
                          <strong>Question:</strong> {question.text}
                        </div>
                      )}
                      <div className='space-y-2'>
                        <strong>Options:</strong>
                        {question.options.map((option, index) => (
                          <Card
                            key={`preview-${question.id}-${index}`}
                            className={`p-2 ${
                              index === question.correctAnswer
                                ? 'bg-green-100 dark:bg-green-900/20 border-green-300'
                                : 'bg-white dark:bg-slate-700 border-gray-300'
                            }`}
                          >
                            <CardContent className='p-0 flex items-center'>
                              <span className='mr-2'>
                                {String.fromCharCode(65 + index)}.
                              </span>
                              {option || `Option ${index + 1}`}
                              {index === question.correctAnswer && (
                                <Badge
                                  variant='secondary'
                                  className='ml-2 text-green-600 dark:text-green-400 bg-transparent border-0 p-0'
                                >
                                  ✓ Correct
                                </Badge>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      {question.explanation && (
                        <Card className='mt-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200'>
                          <CardContent className='p-3'>
                            <strong>Explanation:</strong> {question.explanation}
                          </CardContent>
                        </Card>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  // Edit Mode
                  <div className='space-y-6 mt-4'>
                    {/* Question Text */}
                    <div>
                      <Label
                        htmlFor={`question-text-${question.id}`}
                        className='text-foreground text-sm mb-2 font-semibold'
                      >
                        Question Text <span className='text-red-500'>*</span>
                      </Label>
                      <Textarea
                        id={`question-text-${question.id}`}
                        placeholder={`Enter your question here (minimum 10 characters)...`}
                        value={question.text}
                        onChange={(e) =>
                          updateQuestion(question.id, 'text', e.target.value)
                        }
                        onBlur={() => handleBlur(question.id, 'text')}
                        className={`bg-transparent text-foreground placeholder:text-foreground/70 min-h-25 resize-y focus:ring-offset-0 focus:ring-0 border ${
                          questionErrors?.text && touched[`${question.id}-text`]
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-gray-300 dark:border-slate-700'
                        }`}
                      />
                      {questionErrors?.text &&
                        touched[`${question.id}-text`] && (
                          <p className='text-red-500 text-sm mt-1'>
                            {questionErrors.text}
                          </p>
                        )}
                    </div>

                    {/* Options */}
                    <div>
                      <Label className='text-foreground text-sm mb-3 font-semibold block'>
                        Options (Select the correct answer){' '}
                        <span className='text-red-500'>*</span>
                      </Label>
                      <RadioGroup
                        value={question.correctAnswer.toString()}
                        onValueChange={(value) =>
                          setCorrectAnswer(question.id, parseInt(value))
                        }
                        className='space-y-3'
                      >
                        {question.options.map((option, optionIndex) => (
                          <div
                            key={`option-${question.id}-${optionIndex}`}
                            className='flex items-start gap-3'
                          >
                            <RadioGroupItem
                              value={optionIndex.toString()}
                              id={`option-${question.id}-${optionIndex}`}
                              className='w-4 h-4 mt-2'
                            />
                            <div className='flex-1'>
                              <Input
                                placeholder={`Option ${optionIndex + 1}`}
                                value={option}
                                onChange={(e) =>
                                  updateOption(
                                    question.id,
                                    optionIndex,
                                    e.target.value
                                  )
                                }
                                onBlur={() =>
                                  handleBlur(
                                    question.id,
                                    `option-${optionIndex}`
                                  )
                                }
                                className={`bg-transparent text-foreground placeholder:text-foreground/70 focus:ring-offset-0 focus:ring-0 border ${
                                  questionErrors?.options?.[optionIndex] &&
                                  touched[
                                    `${question.id}-option-${optionIndex}`
                                  ]
                                    ? 'border-red-500 focus:border-red-500'
                                    : 'border-gray-300 dark:border-slate-700'
                                }`}
                              />
                              {questionErrors?.options?.[optionIndex] &&
                                touched[
                                  `${question.id}-option-${optionIndex}`
                                ] && (
                                  <p className='text-red-500 text-sm mt-1'>
                                    {questionErrors.options[optionIndex]}
                                  </p>
                                )}
                            </div>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>

                    {/* Explanation */}
                    <div>
                      <Label
                        htmlFor={`explanation-${question.id}`}
                        className='text-foreground text-sm mb-2 font-semibold'
                      >
                        Explanation (shown after answering)
                      </Label>
                      <Textarea
                        id={`explanation-${question.id}`}
                        placeholder='Explain why this is the correct answer...'
                        value={question.explanation}
                        onChange={(e) =>
                          updateQuestion(
                            question.id,
                            'explanation',
                            e.target.value
                          )
                        }
                        className='bg-transparent text-foreground placeholder:text-foreground/70 min-h-20 resize-y focus:ring-offset-0 focus:ring-0 border border-gray-300 dark:border-slate-700'
                      />
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}
