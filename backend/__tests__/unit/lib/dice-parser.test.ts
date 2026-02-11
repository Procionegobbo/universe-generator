import { DiceParser } from '../../../src/lib/example_star_generator';

describe('DiceParser', () => {
  describe('parse', () => {
    test('should parse simple dice notation "2d6"', () => {
      // Mock random to always return 0.5 (resulting in 4 per die: floor(0.5 * 6) + 1 = 4)
      const mockRandom = jest.fn(() => 0.5);
      const result = DiceParser.parse('2d6', mockRandom);
      // 2 dice * (floor(0.5 * 6) + 1) = 2 * 4 = 8
      expect(result).toBe(8);
      expect(mockRandom).toHaveBeenCalledTimes(2);
    });

    test('should parse dice notation with positive modifier "2d6+3"', () => {
      const mockRandom = jest.fn(() => 0.5);
      const result = DiceParser.parse('2d6+3', mockRandom);
      // 2 dice * 4 + 3 = 11
      expect(result).toBe(11);
    });

    test('should parse dice notation with negative modifier "1d20-5"', () => {
      const mockRandom = jest.fn(() => 0.5);
      const result = DiceParser.parse('1d20-5', mockRandom);
      // 1 die * (floor(0.5 * 20) + 1) - 5 = 11 - 5 = 6
      expect(result).toBe(6);
    });

    test('should parse dice notation without modifier "1d100"', () => {
      const mockRandom = jest.fn(() => 0.5);
      const result = DiceParser.parse('1d100', mockRandom);
      // floor(0.5 * 100) + 1 = 51
      expect(result).toBe(51);
    });

    test('should fall back to number parsing for invalid dice notation', () => {
      const result = DiceParser.parse('42');
      expect(result).toBe(42);
    });

    test('should return 0 for non-numeric invalid string', () => {
      const result = DiceParser.parse('invalid');
      expect(result).toBe(0);
    });

    test('should handle empty string', () => {
      const result = DiceParser.parse('');
      expect(result).toBe(0);
    });

    test('should handle zero dice "0d6" (edge case)', () => {
      const mockRandom = jest.fn();
      const result = DiceParser.parse('0d6', mockRandom);
      // 0 dice means no random calls, total = 0
      expect(result).toBe(0);
      expect(mockRandom).not.toHaveBeenCalled();
    });

    test('should use Math.random by default', () => {
      const originalRandom = Math.random;
      let randomCalled = false;
      Math.random = jest.fn(() => {
        randomCalled = true;
        return 0.5;
      });

      try {
        DiceParser.parse('1d6');
        expect(randomCalled).toBe(true);
      } finally {
        Math.random = originalRandom;
      }
    });

    test('should handle dice notation with multiple digit counts and sides', () => {
      const mockRandom = jest.fn(() => 0.5);
      const result = DiceParser.parse('10d100', mockRandom);
      // 10 dice * (floor(0.5 * 100) + 1) = 10 * 51 = 510
      expect(result).toBe(510);
      expect(mockRandom).toHaveBeenCalledTimes(10);
    });

    test('should handle random function that returns 0 (minimum roll)', () => {
      const mockRandom = jest.fn(() => 0);
      const result = DiceParser.parse('1d6', mockRandom);
      // floor(0 * 6) + 1 = 1
      expect(result).toBe(1);
    });

    test('should handle random function that returns just under 1 (maximum roll)', () => {
      const mockRandom = jest.fn(() => 0.999999);
      const result = DiceParser.parse('1d6', mockRandom);
      // floor(0.999999 * 6) + 1 = 6
      expect(result).toBe(6);
    });
  });
});