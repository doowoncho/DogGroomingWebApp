import { render, screen, fireEvent } from '@testing-library/react'
import BreedAutoComplete from '@/components/ui/BreedAutoComplete'

describe('BreedAutoComplete', () => {
  it('filters breeds and selects a suggestion', () => {
    const onChange = jest.fn()

    render(<BreedAutoComplete value="" onChange={onChange} placeholder="Search breed" />)

    fireEvent.change(screen.getByPlaceholderText('Search breed'), { target: { value: 'gold' } })

    expect(screen.getByText('Golden Retriever')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Golden Retriever'))

    expect(onChange).toHaveBeenCalledWith('Golden Retriever')
  })
})
