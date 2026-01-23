'use client'

import type React from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Upload, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAsyncAction } from '@/hooks'

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
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

  const selectedCategory = watch('category')

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        return
      }
      setSelectedFile(file)
    }
  }

  const { execute: onSubmit, isLoading: isSubmitting } = useAsyncAction(
    async (data: ContactFormData) => {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Here you would send the data to your backend
      console.log('Form submitted:', { ...data, attachment: selectedFile })

      reset()
      setSelectedFile(null)
    }
  )

  return (
    <div className='space-y-8 bg-transparent border border-gray-300 dark:border-slate-700 rounded-lg p-8'>
      <div className='flex items-center justify-between mb-8 '>
        <h2 className='text-2xl font-bold text-foreground'>Contact Support</h2>
      </div>

      <form className='space-y-6' onSubmit={handleSubmit(onSubmit)}>
        {/* Name and Email row */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <div className='space-y-2'>
            <Label htmlFor='name' className='text-foreground font-medium'>
              Name <span className='text-red-500'>*</span>
            </Label>
            <Input
              id='name'
              placeholder='Your name'
              {...register('name')}
              className={`bg-transparent border text-foreground placeholder:text-foreground/70 focus:border-blue-500 ${
                errors.name
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-300 dark:border-slate-700'
              }`}
            />
            {errors.name && (
              <p className='text-red-500 text-sm'>{errors.name.message}</p>
            )}
          </div>
          <div className='space-y-2'>
            <Label htmlFor='email' className='text-foreground font-medium'>
              Email <span className='text-red-500'>*</span>
            </Label>
            <Input
              id='email'
              type='email'
              placeholder='your.email@example.com'
              {...register('email')}
              className={`bg-transparent border text-foreground placeholder:text-foreground/70 focus:border-blue-500 ${
                errors.email
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-300 dark:border-slate-700'
              }`}
            />
            {errors.email && (
              <p className='text-red-500 text-sm'>{errors.email.message}</p>
            )}
          </div>
        </div>

        {/* Subject and Category row */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <div className='space-y-2'>
            <Label htmlFor='subject' className='text-foreground font-medium'>
              Subject <span className='text-red-500'>*</span>
            </Label>
            <Input
              id='subject'
              placeholder='Brief description of your issue'
              {...register('subject')}
              className={`bg-transparent border text-foreground placeholder:text-foreground/70 focus:border-blue-500 ${
                errors.subject
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-300 dark:border-slate-700'
              }`}
            />
            {errors.subject && (
              <p className='text-red-500 text-sm'>{errors.subject.message}</p>
            )}
          </div>
          <div className='space-y-2'>
            <Label htmlFor='category' className='text-foreground font-medium'>
              Category <span className='text-red-500'>*</span>
            </Label>
            <Select
              value={selectedCategory}
              onValueChange={(value) => setValue('category', value)}
            >
              <SelectTrigger
                className={`bg-transparent text-foreground focus:border-default ${
                  errors.category
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-gray-300 dark:border-slate-700'
                }`}
              >
                <SelectValue placeholder='Select a category' />
              </SelectTrigger>
              <SelectContent className='bg-gray-300 dark:bg-slate-700 border-gray-300 dark:border-slate-700'>
                <SelectItem
                  value='general'
                  className='text-foreground hover:bg-default-hover'
                >
                  General
                </SelectItem>
                <SelectItem
                  value='account'
                  className='text-foreground hover:bg-default-hover'
                >
                  Account
                </SelectItem>
                <SelectItem
                  value='billing'
                  className='text-foreground hover:bg-default-hover'
                >
                  Billing
                </SelectItem>
                <SelectItem
                  value='quiz-creation'
                  className='text-foreground hover:bg-default-hover'
                >
                  Quiz Creation
                </SelectItem>
                <SelectItem
                  value='tournaments'
                  className='text-foreground hover:bg-default-hover'
                >
                  Tournaments
                </SelectItem>
                <SelectItem
                  value='privacy'
                  className='text-foreground hover:bg-default-hover'
                >
                  Privacy
                </SelectItem>
                <SelectItem
                  value='technical'
                  className='text-foreground hover:bg-default-hover'
                >
                  Technical Issues
                </SelectItem>
              </SelectContent>
            </Select>
            {errors.category && (
              <p className='text-red-500 text-sm'>{errors.category.message}</p>
            )}
          </div>
        </div>

        {/* Message field */}
        <div className='space-y-2'>
          <Label htmlFor='message' className='text-foreground font-medium'>
            Message <span className='text-red-500'>*</span>
          </Label>
          <Textarea
            id='message'
            placeholder='Please describe your issue in detail (minimum 20 characters)'
            rows={8}
            {...register('message')}
            className={`bg-transparent border text-foreground placeholder:text-foreground/70 focus:border-default resize-none ${
              errors.message
                ? 'border-red-500 focus:border-red-500'
                : 'border-gray-300 dark:border-slate-700'
            }`}
          />
          {errors.message && (
            <p className='text-red-500 text-sm'>{errors.message.message}</p>
          )}
        </div>

        {/* File upload */}
        <div className='space-y-2'>
          <Label htmlFor='attachment' className='text-foreground font-medium'>
            Attachment (optional)
          </Label>
          <div className='space-y-2'>
            <div className='relative inline-block'>
              <input
                id='attachment'
                type='file'
                onChange={handleFileChange}
                accept='.jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt'
                className='absolute inset-0 w-full h-full opacity-0 cursor-pointer'
              />
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='bg-transparent border border-gray-300 dark:border-slate-700 text-foreground hover:bg-default-hover hover:border-default px-4'
              >
                <Upload className='w-4 h-4 mr-2' />
                {selectedFile ? selectedFile.name : 'Upload File'}
              </Button>
            </div>
            <p className='text-sm text-foreground/70'>
              Accepted file types: Images, PDF, DOC, DOCX, TXT (Max 5MB)
            </p>
          </div>
        </div>

        {/* Submit button */}
        <Button
          type='submit'
          disabled={isSubmitting}
          className='bg-default hover:bg-default-hover text-foreground px-8 py-2 disabled:opacity-50'
        >
          {isSubmitting ? (
            <>
              <Loader2 className='w-4 h-4 mr-2 animate-spin' />
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
