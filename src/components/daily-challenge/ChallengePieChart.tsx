'use client'

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  PieLabelRenderProps
} from 'recharts'

const data = [
  { name: 'Science', value: 35, color: '#8884d8' },
  { name: 'History', value: 25, color: '#82ca9d' },
  { name: 'Geography', value: 20, color: '#ffc658' },
  { name: 'Entertainment', value: 15, color: '#ff8042' },
  { name: 'Sports', value: 5, color: '#0088fe' }
]

const RADIAN = Math.PI / 180

const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  index
}: PieLabelRenderProps & { index?: number }) => {
  const radius =
    (innerRadius as number) +
    ((outerRadius as number) - (innerRadius as number)) * 1.2
  const x = (cx as number) + radius * Math.cos(-midAngle * RADIAN)
  const y = (cy as number) + radius * Math.sin(-midAngle * RADIAN)

  const color = data[index ?? 0].color

  return (
    <text
      x={x}
      y={y}
      fill={color}
      textAnchor={x > (cx as number) ? 'start' : 'end'}
      dominantBaseline='central'
      className='text-sm font-medium'
    >
      {`${data[index ?? 0].name} ${((percent as number) * 100).toFixed(0)}%`}
    </text>
  )
}

export default function ChallengePieChart() {
  return (
    <div className='w-full max-w-4xl mx-auto p-8 bg-background rounded-lg'>
      <div className='h-96'>
        <ResponsiveContainer width='100%' height='100%'>
          <PieChart>
            <Pie
              data={data}
              cx='50%'
              cy='50%'
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={120}
              fill='#8884d8'
              dataKey='value'
              className='text-foreground'
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  className='text-foreground'
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--main)',
                border: 'none',
                padding: '10px'
              }}
              itemStyle={{ color: 'var(--foreground)' }}
              formatter={(value: number, name: string) => [`${value}%`, name]}
            />
            <Legend wrapperStyle={{ color: 'var(--foreground)' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <p className='text-center text-foreground/70 text-sm mt-4'>
        Distribution of your correct answers by category
      </p>
    </div>
  )
}
