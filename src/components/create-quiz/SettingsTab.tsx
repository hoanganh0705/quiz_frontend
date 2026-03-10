'use client'

import { memo, useState } from 'react'
import { Label } from '@/components/ui/label'
// Fix barrel imports (bundle-barrel-imports)
import { Select } from '@/components/ui/select'
import { SelectContent } from '@/components/ui/select'
import { SelectItem } from '@/components/ui/select'
import { SelectTrigger } from '@/components/ui/select'
import { SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Card } from '@/components/ui/card'
import { CardContent } from '@/components/ui/card'
import { CardHeader } from '@/components/ui/card'
import { CardTitle } from '@/components/ui/card'

// Wrap component in memo to prevent unnecessary re-renders
const SettingsTab = memo(function SettingsTab() {
  const [passingScore, setPassingScore] = useState(70)

  return (
    <Card
      className='bg-card border-border shadow-sm py-10'
      role='region'
      aria-labelledby='settings-title'
    >
      <CardHeader className='pb-4'>
        <CardTitle
          id='settings-title'
          className='text-xl font-semibold text-foreground'
        >
          Quiz Settings
        </CardTitle>
      </CardHeader>

      <CardContent className='space-y-5' role='form'>
        {/* Time Limit */}
        <section>
          <Label
            htmlFor='time-limit'
            className='text-foreground text-sm mb-2 font-medium block'
          >
            Time Limit (minutes)
          </Label>
          <Select defaultValue='no-limit'>
            <SelectTrigger
              id='time-limit'
              className='w-full bg-background text-foreground border-border focus:ring-2 focus:ring-ring focus:border-transparent rounded-md'
            >
              <SelectValue placeholder='Select time limit' />
            </SelectTrigger>
            <SelectContent className='bg-popover border-border'>
              <SelectItem
                value='no-limit'
                className='text-foreground hover:bg-accent'
              >
                No time limit
              </SelectItem>
              <SelectItem value='5' className='text-foreground hover:bg-accent'>
                5 minutes
              </SelectItem>
              <SelectItem
                value='10'
                className='text-foreground hover:bg-accent'
              >
                10 minutes
              </SelectItem>
              <SelectItem
                value='15'
                className='text-foreground hover:bg-accent'
              >
                15 minutes
              </SelectItem>
              <SelectItem
                value='30'
                className='text-foreground hover:bg-accent'
              >
                30 minutes
              </SelectItem>
              <SelectItem
                value='60'
                className='text-foreground hover:bg-accent'
              >
                60 minutes
              </SelectItem>
            </SelectContent>
          </Select>
        </section>

        {/* Time Per Question */}
        <section>
          <Label
            htmlFor='time-per-question'
            className='text-foreground text-sm mb-2 font-medium block'
          >
            Time Per Question (seconds)
          </Label>
          <Select defaultValue='no-limit-per-question'>
            <SelectTrigger
              id='time-per-question'
              className='w-full bg-background text-foreground border-border focus:ring-2 focus:ring-ring focus:border-transparent rounded-md'
            >
              <SelectValue placeholder='Select time per question' />
            </SelectTrigger>
            <SelectContent className='bg-popover border-border'>
              <SelectItem
                value='no-limit-per-question'
                className='text-foreground hover:bg-accent'
              >
                No limit per question
              </SelectItem>
              <SelectItem
                value='10'
                className='text-foreground hover:bg-accent'
              >
                10 seconds
              </SelectItem>
              <SelectItem
                value='20'
                className='text-foreground hover:bg-accent'
              >
                20 seconds
              </SelectItem>
              <SelectItem
                value='30'
                className='text-foreground hover:bg-accent'
              >
                30 seconds
              </SelectItem>
              <SelectItem
                value='60'
                className='text-foreground hover:bg-accent'
              >
                60 seconds
              </SelectItem>
              <SelectItem
                value='120'
                className='text-foreground hover:bg-accent'
              >
                2 minutes
              </SelectItem>
            </SelectContent>
          </Select>
        </section>

        {/* Randomize Questions */}
        <section className='flex items-center justify-between py-2'>
          <Label
            htmlFor='randomize-questions'
            className='text-foreground text-sm font-medium'
          >
            Randomize Questions
          </Label>
          <Switch
            id='randomize-questions'
            className='data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted'
          />
        </section>

        {/* Show Explanations After Answering */}
        <section className='flex items-center justify-between py-2'>
          <Label
            htmlFor='show-explanations'
            className='text-foreground text-sm font-medium'
          >
            Show Explanations After Answering
          </Label>
          <Switch
            id='show-explanations'
            defaultChecked
            className='data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted'
          />
        </section>

        {/* Allow Retakes */}
        <section className='flex items-center justify-between py-2'>
          <Label
            htmlFor='allow-retakes'
            className='text-foreground text-sm font-medium'
          >
            Allow Retakes
          </Label>
          <Switch
            id='allow-retakes'
            defaultChecked
            className='data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted'
          />
        </section>

        {/* Passing Score */}
        <section className='py-2'>
          <div className='flex items-center justify-between mb-3'>
            <Label className='text-foreground text-sm font-medium'>
              Passing Score: {passingScore}%
            </Label>
          </div>
          <Slider
            value={[passingScore]}
            onValueChange={(value) => setPassingScore(value[0])}
            max={100}
            min={0}
            step={1}
            className='w-full [&>span:first-child]:bg-muted **:[[role=slider]]:bg-default dark:**:[[role=slider]]:bg-default-hover [&>span:first-child>span]:bg-default dark:[&>span:first-child>span]:bg-default-hover'
          />
        </section>

        {/* Quiz Visibility */}
        <section>
          <Label
            htmlFor='quiz-visibility'
            className='text-foreground text-sm mb-2 font-medium block'
          >
            Quiz Visibility
          </Label>
          <Select defaultValue='private'>
            <SelectTrigger
              id='quiz-visibility'
              className='w-full bg-background text-foreground border-border focus:ring-2 focus:ring-ring focus:border-transparent rounded-md'
            >
              <SelectValue placeholder='Select visibility' />
            </SelectTrigger>
            <SelectContent className='bg-popover border-border'>
              <SelectItem
                value='private'
                className='text-foreground hover:bg-accent'
              >
                Private (Only you can see)
              </SelectItem>
              <SelectItem
                value='public'
                className='text-foreground hover:bg-accent'
              >
                Public (Everyone can see)
              </SelectItem>
              <SelectItem
                value='unlisted'
                className='text-foreground hover:bg-accent'
              >
                Unlisted (Only with link)
              </SelectItem>
            </SelectContent>
          </Select>
        </section>
      </CardContent>
    </Card>
  )
})

export default SettingsTab
