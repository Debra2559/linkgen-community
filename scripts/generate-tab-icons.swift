import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let outputDirectory = URL(fileURLWithPath: CommandLine.arguments.dropFirst().first ?? "assets/tabbar", isDirectory: true)
try FileManager.default.createDirectory(at: outputDirectory, withIntermediateDirectories: true)

func rgb(_ hex: String) -> CGColor {
  let value = Int(hex.dropFirst(), radix: 16) ?? 0
  return CGColor(red: CGFloat((value >> 16) & 255) / 255, green: CGFloat((value >> 8) & 255) / 255, blue: CGFloat(value & 255) / 255, alpha: 1)
}

func drawIcon(name: String, selected: Bool, draw: (CGContext) -> Void) throws {
  let size = 48
  let colorSpace = CGColorSpaceCreateDeviceRGB()
  guard let context = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: 0, space: colorSpace, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return }
  context.setStrokeColor(rgb(selected ? "#f36b4f" : "#83918c"))
  context.setLineWidth(2.6)
  context.setLineCap(.round)
  context.setLineJoin(.round)
  context.translateBy(x: 0, y: CGFloat(size))
  context.scaleBy(x: 1, y: -1)
  draw(context)
  guard let image = context.makeImage() else { return }
  let fileURL = outputDirectory.appendingPathComponent("\(name)\(selected ? "-active" : "").png")
  guard let destination = CGImageDestinationCreateWithURL(fileURL as CFURL, UTType.png.identifier as CFString, 1, nil) else { return }
  CGImageDestinationAddImage(destination, image, nil)
  CGImageDestinationFinalize(destination)
}

let drawings: [(String, (CGContext) -> Void)] = [
  ("discover", { context in
    context.addEllipse(in: CGRect(x: 8, y: 8, width: 32, height: 32))
    context.move(to: CGPoint(x: 28, y: 16)); context.addLine(to: CGPoint(x: 20, y: 28)); context.addLine(to: CGPoint(x: 32, y: 24)); context.addLine(to: CGPoint(x: 28, y: 16))
    context.strokePath()
  }),
  ("events", { context in
    context.addPath(CGPath(roundedRect: CGRect(x: 8, y: 10, width: 32, height: 29), cornerWidth: 5, cornerHeight: 5, transform: nil))
    context.move(to: CGPoint(x: 8, y: 20)); context.addLine(to: CGPoint(x: 40, y: 20))
    context.move(to: CGPoint(x: 17, y: 7)); context.addLine(to: CGPoint(x: 17, y: 14))
    context.move(to: CGPoint(x: 31, y: 7)); context.addLine(to: CGPoint(x: 31, y: 14))
    context.addEllipse(in: CGRect(x: 16, y: 26, width: 3, height: 3)); context.addEllipse(in: CGRect(x: 24, y: 26, width: 3, height: 3))
    context.strokePath()
  }),
  ("contacts", { context in
    context.addEllipse(in: CGRect(x: 13, y: 10, width: 10, height: 10)); context.addEllipse(in: CGRect(x: 27, y: 12, width: 8, height: 8))
    context.addArc(center: CGPoint(x: 18, y: 34), radius: 12, startAngle: .pi, endAngle: 0, clockwise: false)
    context.addArc(center: CGPoint(x: 31, y: 34), radius: 9, startAngle: .pi, endAngle: 0, clockwise: false)
    context.strokePath()
  }),
  ("profile", { context in
    context.addEllipse(in: CGRect(x: 18, y: 8, width: 12, height: 12))
    context.addArc(center: CGPoint(x: 24, y: 39), radius: 14, startAngle: .pi, endAngle: 0, clockwise: false)
    context.strokePath()
  })
]

for (name, drawing) in drawings {
  try drawIcon(name: name, selected: false, draw: drawing)
  try drawIcon(name: name, selected: true, draw: drawing)
}
