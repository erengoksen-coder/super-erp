import { render, screen } from '@testing-library/react'
import ModulePlaceholder from '@/components/ModulePlaceholder'

describe('ModulePlaceholder', () => {
  it('renders title, description and features', () => {
    render(
      <ModulePlaceholder
        title="Test Modul"
        description="Test aciklama"
        features={['Ozellik 1', 'Ozellik 2']}
      />
    )

    expect(screen.getByText('Test Modul')).toBeInTheDocument()
    expect(screen.getByText('Test aciklama')).toBeInTheDocument()
    expect(screen.getByText('Ozellik 1')).toBeInTheDocument()
    expect(screen.getByText('Ozellik 2')).toBeInTheDocument()
  })
})
