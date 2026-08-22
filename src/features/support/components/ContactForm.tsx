'use client'

import type React from 'react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAsyncAction } from '@/shared/hooks'
import { submitContactForm } from '@/features/support/api/support'
import type { ContactCategory } from '@/features/support/api/support'

// Validation schema
const contactFormSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Please enter a valid email address'),
  subject: z
    .string()
    .min(5, 'Subject must be at least 5 characters')
    .max(200, 'Subject must be less than 200 characters'),
  category: z.string().min(1, 'Please select a category'),
  message: z
    .string()
    .min(20, 'Message must be at least 20 characters')
    .max(2000, 'Message must be less than 2000 characters')
})

type ContactFormData = z.infer<typeof contactFormSchema>

export function ContactForm() {
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors }
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: '',
      email: '',
      subject: '',
      category: '',
      message: ''
    }
  })

  const { execute: onSubmit, isLoading: isSubmitting, error: submitError } = useAsyncAction(
    async (data: ContactFormData) => {
      await submitContactForm({
        name: data.name,
        email: data.email,
        subject: data.subject,
        category: data.category as ContactCategory,
        message: data.message
      })

      setSubmitSuccess(true)
      reset()

      setTimeout(() => setSubmitSuccess(false), 5000)
    }
  )

  return (
    <div className='space-y-8 bg-transparent border border-border rounded-lg p-8'>
      <div className='flex items-center justify-between mb-8 '>
        <h2 className='text-2xl font-bold text-foreground'>Contact Support</h2>
      </div>

      <form className='space-y-6' onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* Name and Email row */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <div className='space-y-2'>
            <Label htmlFor='name' className='text-foreground font-medium'>
              Name <span className='text-destructive'>*</span>
            </Label>
            <Input
              id='name'
              placeholder='Your name'
              {...register('name')}
              className={`bg-transparent border text-foreground placeholder:text-muted-foreground focus:border-brand ${
                errors.name
                  ? 'border-destructive focus:border-destructive'
                  : 'border-border'
              }`}
            />
            {errors.name && (
              <p className='text-destructive text-sm' role='alert'>
                {errors.name.message}
              </p>
            )}
          </div>
          <div className='space-y-2'>
            <Label htmlFor='email' className='text-foreground font-medium'>
              Email <span className='text-destructive'>*</span>
            </Label>
            <Input
              id='email'
              type='email'
              placeholder='your.email@example.com'
              {...register('email')}
              className={`bg-transparent border text-foreground placeholder:text-muted-foreground focus:border-brand ${
                errors.email
                  ? 'border-destructive focus:border-destructive'
                  : 'border-border'
              }`}
            />
            {errors.email && (
              <p className='text-destructive text-sm' role='alert'>
                {errors.email.message}
              </p>
            )}
          </div>
        </div>

        {/* Subject and Category row */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <div className='space-y-2'>
            <Label htmlFor='subject' className='text-foreground font-medium'>
              Subject <span className='text-destructive'>*</span>
            </Label>
            <Input
              id='subject'
              placeholder='Brief description of your issue'
              {...register('subject')}
              className={`bg-transparent border text-foreground placeholder:text-muted-foreground focus:border-brand ${
                errors.subject
                  ? 'border-destructive focus:border-destructive'
                  : 'border-border'
              }`}
            />
            {errors.subject && (
              <p className='text-destructive text-sm' role='alert'>
                {errors.subject.message}
              </p>
            )}
          </div>
          <div className='space-y-2'>
            <Label htmlFor='category' className='text-foreground font-medium'>
              Category <span className='text-destructive'>*</span>
            </Label>
            <Select onValueChange={(value) => setValue('category', value, { shouldValidate: true })}>
              <SelectTrigger
                id='category'
                className={`bg-transparent text-foreground focus:border-brand ${
                  errors.category
                    ? 'border-destructive focus:border-destructive'
                    : 'border-border'
                }`}
              >
                <SelectValue placeholder='Select a category' />
              </SelectTrigger>
              <SelectContent className='bg-muted border-border'>
                <SelectItem
                  value='general'
                  className='text-foreground hover:bg-brand'
                >
                  General
                </SelectItem>
                <SelectItem
                  value='account'
                  className='text-foreground hover:bg-brand'
                >
                  Account
                </SelectItem>
                <SelectItem
                  value='billing'
                  className='text-foreground hover:bg-brand'
                >
                  Billing
                </SelectItem>
                <SelectItem
                  value='quiz-creation'
                  className='text-foreground hover:bg-brand'
                >
                  Quiz Creation
                </SelectItem>
                <SelectItem
                  value='tournaments'
                  className='text-foreground hover:bg-brand'
                >
                  Tournaments
                </SelectItem>
                <SelectItem
                  value='privacy'
                  className='text-foreground hover:bg-brand'
                >
                  Privacy
                </SelectItem>
                <SelectItem
                  value='technical'
                  className='text-foreground hover:bg-brand'
                >
                  Technical Issues
                </SelectItem>
              </SelectContent>
            </Select>
            {errors.category && (
              <p id='category-error' className='text-destructive text-sm' role='alert'>
                {errors.category.message}
              </p>
            )}
          </div>
        </div>

        {/* Message field */}
        <div className='space-y-2'>
          <Label htmlFor='message' className='text-foreground font-medium'>
            Message <span className='text-destructive'>*</span>
          </Label>
          <Textarea
            id='message'
            placeholder='Please describe your issue in detail (minimum 20 characters)'
            rows={8}
            {...register('message')}
            className={`bg-transparent border text-foreground placeholder:text-muted-foreground focus:border-brand resize-none ${
              errors.message
                ? 'border-destructive focus:border-destructive'
                : 'border-border'
            }`}
          />
          {errors.message && (
            <p className='text-destructive text-sm' role='alert'>
              {errors.message.message}
            </p>
          )}
        </div>

        {/* File upload — removed in Phase 5/6. ContactForm does not
            submit attachments; the input here was dead UI. Re-enable
            when the backend adds an attachment-upload endpoint. */}

        {/* Submit button */}
        {submitSuccess && (
          <div
            className='p-4 bg-success/10 border border-success/20 rounded-lg'
            role='status'
            aria-live='polite'
          >
            <p className='text-success text-sm font-medium'>
              Your message has been submitted successfully. We&apos;ll get back to you soon.
            </p>
          </div>
        )}

        {submitError && (
          <div
            className='p-4 bg-destructive/10 border border-destructive/20 rounded-lg'
            role='alert'
            aria-live='assertive'
          >
            <p className='text-destructive text-sm font-medium'>
              Failed to submit your message. Please try again or email us directly at support@quizhub.com.
            </p>
          </div>
        )}

        <Button
          type='submit'
          disabled={isSubmitting}
          className='bg-brand hover:bg-brand-hover text-brand-foreground px-8 py-2 disabled:opacity-50'
        >
          {isSubmitting ? (
            <>
              <Loader2 className='w-4 h-4 mr-2 animate-spin' aria-hidden='true' />
              Submitting...
            </>
          ) : (
            'Submit Request'
          )}
        </Button>
      </form>
    </div>
  )
}
