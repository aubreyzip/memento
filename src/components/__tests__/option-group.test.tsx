import { fireEvent, render, screen } from '@testing-library/react-native';

import { OptionGroup } from '../option-group';

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
] as const;

describe('OptionGroup', () => {
  it('exposes a labelled group of radios with one selected', async () => {
    await render(
      <OptionGroup accessibilityLabel="Choice" options={options} value="b" onChange={jest.fn()} />,
    );

    // The group is labelled but is not itself an accessibility element: on iOS that would hide
    // the individual radios from screen readers.
    expect(screen.getByLabelText('Choice')).toHaveProp('accessibilityRole', 'radiogroup');
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByRole('radio', { name: 'Beta' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'Alpha' })).not.toBeSelected();
  });

  it('reports the pressed option', async () => {
    const onChange = jest.fn();
    await render(
      <OptionGroup accessibilityLabel="Choice" options={options} value="a" onChange={onChange} />,
    );

    await fireEvent.press(screen.getByRole('radio', { name: 'Beta' }));

    expect(onChange).toHaveBeenCalledWith('b');
  });
});
