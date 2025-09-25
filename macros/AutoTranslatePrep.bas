Attribute VB_Name = "Effiency test"
Option Explicit

Public Enum SlideAction
    saDelete = 1
    saGreen = 2
    saPink = 3
End Enum

Public Sub ProcessSlidesByKeywords( _
    Optional ByVal keyword1 As String = "", _
    Optional ByVal keyword2 As String = "", _
    Optional ByVal action As SlideAction = saPink, _
    Optional ByVal applyToWholeTable As Boolean = False, _
    Optional ByVal idColumn As Long = 1)

    Dim tbl As Table
    Dim maxRows As Long
    Dim marks() As Boolean
    Dim rowHasKeyword1() As Boolean
    Dim rowHasKeyword2() As Boolean
    Dim rowIDs() As String
    Dim rowAnchors() As cell
    Dim colorIndex As WdColorIndex
    Dim hasKeyword1 As Boolean
    Dim hasKeyword2 As Boolean
    Dim singleKeywordMode As Boolean
    Dim cellInfos As Collection
    Dim keywordHitRanges As Collection
    Dim anyMarked As Boolean
    Dim tableHasKeyword As Boolean

    Dim c As cell
    Dim info As Variant
    Dim hitRange As Variant
    Dim r As Long
    Dim rowStart As Long
    Dim rowEnd As Long
    Dim colIndex As Long
    Dim cleanTxt As String
    Dim slideID As String
    Dim seenIDs As Object
    Dim key As String
    Dim rr As Long
    Dim match1 As Boolean
    Dim match2 As Boolean

    If idColumn < 1 Then idColumn = 1

    hasKeyword1 = (LenB(keyword1) > 0)
    hasKeyword2 = (LenB(keyword2) > 0)
    singleKeywordMode = (hasKeyword1 Xor hasKeyword2)

    Select Case action
        Case saGreen: colorIndex = wdBrightGreen
        Case saPink:  colorIndex = wdPink
    End Select

    Application.ScreenUpdating = False
    On Error GoTo Cleanup

    For Each tbl In ActiveDocument.tables
        maxRows = tbl.Rows.Count
        If maxRows = 0 Then GoTo NextTable

        ReDim marks(1 To maxRows) As Boolean
        ReDim rowHasKeyword1(1 To maxRows) As Boolean
        ReDim rowHasKeyword2(1 To maxRows) As Boolean
        ReDim rowIDs(1 To maxRows) As String
        ReDim rowAnchors(1 To maxRows) As cell
        Set cellInfos = New Collection
        Set keywordHitRanges = New Collection

        anyMarked = False
        tableHasKeyword = False

        For Each c In tbl.Range.Cells
            rowStart = c.Range.Information(wdStartOfRangeRowNumber)
            rowEnd = c.Range.Information(wdEndOfRangeRowNumber)
            If rowEnd < rowStart Then rowEnd = rowStart
            If rowStart < 1 Then rowStart = 1
            If rowEnd > maxRows Then rowEnd = maxRows

            colIndex = c.Range.Information(wdStartOfRangeColumnNumber)
            cleanTxt = CleanCellText(c.Range.Text)

            cellInfos.Add Array(c, rowStart, rowEnd)

            For r = rowStart To rowEnd
                If rowAnchors(r) Is Nothing Then Set rowAnchors(r) = c
            Next r

            If hasKeyword1 Then
                match1 = (InStr(1, cleanTxt, keyword1, vbTextCompare) > 0)
                If match1 Then
                    tableHasKeyword = True
                    For r = rowStart To rowEnd
                        rowHasKeyword1(r) = True
                    Next r
                End If
            Else
                match1 = False
            End If

            If hasKeyword2 Then
                match2 = (InStr(1, cleanTxt, keyword2, vbTextCompare) > 0)
                If match2 Then
                    tableHasKeyword = True
                    For r = rowStart To rowEnd
                        rowHasKeyword2(r) = True
                    Next r
                End If
            Else
                match2 = False
            End If

            If singleKeywordMode And (match1 Or match2) Then
                keywordHitRanges.Add Array(rowStart, rowEnd)
            ElseIf (hasKeyword1 And hasKeyword2) And (match1 Or match2) Then
                tableHasKeyword = True
            End If

            If colIndex = idColumn Then
                For r = rowStart To rowEnd
                    If LenB(rowIDs(r)) = 0 Then
                        rowIDs(r) = cleanTxt
                    End If
                Next r
            End If
        Next c

        If applyToWholeTable Then
            If tableHasKeyword Then
                For r = 1 To maxRows
                    marks(r) = True
                Next r
                anyMarked = True
            End If
            GoTo ApplyAction
        End If

        If hasKeyword1 And hasKeyword2 Then
            For r = 1 To maxRows
                If rowHasKeyword1(r) And rowHasKeyword2(r) Then
                    marks(r) = True
                    anyMarked = True
                End If
            Next r
        ElseIf singleKeywordMode Then
            If keywordHitRanges.Count > 0 Then
                Set seenIDs = CreateObject("Scripting.Dictionary")
                seenIDs.CompareMode = vbTextCompare
                For Each hitRange In keywordHitRanges
                    rowStart = hitRange(0)
                    rowEnd = hitRange(1)
                    For r = rowStart To rowEnd
                        If r >= 1 And r <= maxRows Then
                            slideID = rowIDs(r)
                            If LenB(slideID) > 0 Then
                                key = LCase$(slideID)
                                If Not seenIDs.Exists(key) Then
                                    seenIDs.Add key, True
                                    For rr = 1 To maxRows
                                        If StrComp(rowIDs(rr), slideID, vbTextCompare) = 0 Then
                                            If Not marks(rr) Then
                                                marks(rr) = True
                                                anyMarked = True
                                            End If
                                        End If
                                    Next rr
                                End If
                            End If
                        End If
                    Next r
                Next hitRange
            End If
        End If

ApplyAction:
        If anyMarked Then
            Select Case action
                Case saDelete
                    For r = maxRows To 1 Step -1
                        If marks(r) Then
                            If Not rowAnchors(r) Is Nothing Then
                                rowAnchors(r).Delete wdDeleteCellsEntireRow
                            End If
                        End If
                    Next r
                Case saGreen, saPink
                    For Each info In cellInfos
                        rowStart = info(1)
                        rowEnd = info(2)
                        For r = rowStart To rowEnd
                            If r >= 1 And r <= maxRows Then
                                If marks(r) Then
                                    Set c = info(0)
                                    c.Shading.BackgroundPatternColorIndex = colorIndex
                                    Exit For
                                End If
                            End If
                        Next r
                    Next info
            End Select
        End If

NextTable:
    Next tbl

Cleanup:
    Application.ScreenUpdating = True
End Sub

Public Sub AutoTranslatePrep_BlankVariables_Highlight()
    Dim tbl As Table
    Dim cell As cell
    Dim rowsMap As Object
    Dim rowKey As Variant
    Dim rowCells As Collection
    Dim c As cell
    Dim blankCount As Long
    Dim hasVariable As Boolean
    Dim txt As String

    Application.ScreenUpdating = False

    For Each tbl In ActiveDocument.tables
        Set rowsMap = CreateObject("Scripting.Dictionary")

        For Each cell In tbl.Range.Cells
            If Not rowsMap.Exists(cell.RowIndex) Then
                Set rowCells = New Collection
                rowsMap.Add cell.RowIndex, rowCells
            End If
            rowsMap(cell.RowIndex).Add cell
        Next cell

        For Each rowKey In rowsMap.Keys
            Set rowCells = rowsMap(rowKey)

            If rowCells.Count = 4 Then
                blankCount = 0
                hasVariable = False

                For Each c In rowCells
                    txt = CleanCellText2(c)

                    If LenB(txt) = 0 Then
                        blankCount = blankCount + 1
                    End If
                    If InStr(1, LCase$(txt), "variable") > 0 Then
                        hasVariable = True
                    End If
                Next c

                If blankCount = 2 And hasVariable Then
                    For Each c In rowCells
                        c.Shading.BackgroundPatternColor = wdColorPink
                    Next c
                End If
            End If
        Next rowKey
    Next tbl

    Application.ScreenUpdating = True
End Sub

Public Sub AutoTranslatePrep_Left2Columns_Highlight()
    Dim tbl As Table
    Dim cel As cell
    Dim colNum As Long
    Dim lastCol As Long

    Application.ScreenUpdating = False
    On Error GoTo Cleanup

    For Each tbl In ActiveDocument.tables
        If tbl.Columns.Count >= 3 Then
            lastCol = tbl.Columns.Count
            For Each cel In tbl.Range.Cells
                colNum = cel.Range.Information(wdStartOfRangeColumnNumber)
                If colNum < lastCol Then
                    cel.Shading.BackgroundPatternColorIndex = wdPink
                End If
            Next cel
        End If
    Next tbl

Cleanup:
    Application.ScreenUpdating = True
End Sub

Private Function CleanCellText(ByVal rawText As String) As String
    Dim t As String
    t = rawText
    t = Replace$(t, vbCr, "")
    t = Replace$(t, Chr$(7), "")
    t = Replace$(t, vbLf, "")
    t = Replace$(t, Chr$(9), " ")
    t = Replace$(t, ChrW$(160), " ")
    CleanCellText = Trim$(t)
End Function

Private Function CleanCellText2(ByVal c As cell) As String
    Dim t As String
    t = c.Range.Text
    t = Replace$(t, Chr$(13) & Chr$(7), "")
    t = Replace$(t, Chr$(13), "")
    t = Replace$(t, Chr$(7), "")
    t = Replace$(t, Chr$(160), " ")
    CleanCellText2 = Trim$(t)
End Function

Sub aaaaaaaaaaaatest()
    Call ProcessSlidesByKeywords("Trigger - Set Variable : 0_Status", "", saGreen, False, 1)
    MsgBox "Done!"
End Sub

Sub AutoTranslatePrep_TextID_Preview_newmacro()
    Dim totalSteps As Long, currentStep As Long
    totalSteps = 36
    currentStep = 1
    Application.ScreenUpdating = False

    ShowStep "(Preview) Deleting Slide Name - Course Info", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Course Info", "Slide Name", saGreen, False, 1)
    currentStep = currentStep + 1

    ShowStep "(Preview) Deleting Null Object Text", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Null ", "Null ", saGreen, False, 1)
    currentStep = currentStep + 1

    ShowStep "(Preview) Deleting Variable - Admin Password", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Trigger - Set Variable : 0_Password_Admin", "", saGreen, False, 1)
    currentStep = currentStep + 1

    ShowStep "(Preview) Deleting Answer Key", currentStep, totalSteps
    Call ProcessSlidesByKeywords("%Project.SlideTitle% -", "", saGreen, False, 1)
    currentStep = currentStep + 1

    ShowStep "(Preview) Deleting Variable - Client Password", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Trigger - Set Variable : 0_Password_Client", "", saGreen, False, 1)
    currentStep = currentStep + 1

    ShowStep "(Preview) Deleting Conditions", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Condition", "", saGreen, False, 1)
    currentStep = currentStep + 1

    ShowStep "(Preview) Deleting Variable - Copyright Year", currentStep, totalSteps
    Call ProcessSlidesByKeywords("0_Info_Course_CopyrightYear", "", saGreen, False, 1)
    currentStep = currentStep + 1

    ShowStep "(Preview) Deleting Trigger - CurrentLayout", currentStep, totalSteps
    Call ProcessSlidesByKeywords("0_Info_CurrentLayout", "", saGreen, False, 1)
    currentStep = currentStep + 1

    ShowStep "(Preview) Deleting Variable - Industry", currentStep, totalSteps
    Call ProcessSlidesByKeywords("0_Info_Course_Industry", "", saGreen, False, 1)
    currentStep = currentStep + 1

    ShowStep "(Preview) Deleting Variable - Language", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Trigger - Set Variable : 0_Info_Course_Language", "", saGreen, False, 1)
    currentStep = currentStep + 1

    ShowStep "(Preview) Deleting Course Menu Entries", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Menu Item", "", saGreen, False, 1)
    currentStep = currentStep + 1

    ShowStep "(Preview) Deleting Slide Notes", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Slide Notes", "", saGreen, False, 1)
    currentStep = currentStep + 1

    ShowStep "(Preview) Deleting Variable - Course Version", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Trigger - Set Variable : 0_Info_Course_Version", "", saGreen, False, 1)
    currentStep = currentStep + 1

    ShowStep "(Preview) Deleting Trigger - Set Status", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Trigger - Set Variable : 0_Status", "", saGreen, False, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Blank Variables", currentStep, totalSteps
    Application.Run "AutoTranslatePrep_BlankVariables_Highlight"
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Course Evaluation", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Course Evaluation", "", saPink, False, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Disclaimer", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Disclaimer", "", saPink, False, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Layer ID", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Layer ID", "", saPink, False, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Project Information", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Project Information", "", saPink, True, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Resources", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Resources", "", saPink, False, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Scene ID", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Scene ID", "", saPink, False, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Slide ID", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Slide ID", "", saPink, False, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Slide Master ID", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Slide Master ID", "", saPink, False, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Support", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Custom tab", "", saPink, False, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Table of Contents ID", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Table of Contents ID", "", saPink, False, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Template Text", currentStep, totalSteps
    Call ProcessSlidesByKeywords("[TEMPLATE]", "", saPink, False, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Variables Section", currentStep, totalSteps
    Call ProcessSlidesByKeywords("0_Password_Admin default value", "", saPink, True, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Project Variables ID", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Project variables ID", "", saPink, False, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Slide Name - Question Gallery", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Question Gallery", "Slide Name", saPink, False, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Slide Name - Question Slides", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Question", "Slide Name", saPink, False, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Scene Name - Quiz", currentStep, totalSteps
    Call ProcessSlidesByKeywords("quiz", "Scene Name", saPink, False, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Slide Name - Quiz", currentStep, totalSteps
    Call ProcessSlidesByKeywords("quiz", "Slide Name", saPink, False, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Slide Name - Results", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Results", "Slide Name", saPink, False, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Scene Name - Welcome", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Welcome", "Scene Name", saPink, False, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Slide Name - Welcome", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Welcome", "Slide Name", saPink, False, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Left 2 Columns", currentStep, totalSteps
    Application.Run "AutoTranslatePrep_Left2Columns_Highlight"
    currentStep = currentStep + 1

    MsgBox "Doc prep complete!"
    Application.ScreenUpdating = True
End Sub

Sub AutoTranslatePrep_TextID_newmacro()
    Dim totalSteps As Long, currentStep As Long
    totalSteps = 36
    currentStep = 1
    Application.ScreenUpdating = False

    ShowStep "Deleting Slide Name - Course Info", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Course Info", "Slide Name", saDelete, False, 1)
    currentStep = currentStep + 1

    ShowStep "Deleting Null Object Text", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Null ", "Null ", saDelete, False, 1)
    currentStep = currentStep + 1

    ShowStep "Deleting Variable - Admin Password", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Trigger - Set Variable : 0_Password_Admin", "", saDelete, False, 1)
    currentStep = currentStep + 1

    ShowStep "Deleting Answer Key", currentStep, totalSteps
    Call ProcessSlidesByKeywords("%Project.SlideTitle% -", "", saDelete, False, 1)
    currentStep = currentStep + 1

    ShowStep "Deleting Variable - Client Password", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Trigger - Set Variable : 0_Password_Client", "", saDelete, False, 1)
    currentStep = currentStep + 1

    ShowStep "Deleting Conditions", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Condition", "", saDelete, False, 1)
    currentStep = currentStep + 1

    ShowStep "Deleting Variable - Copyright Year", currentStep, totalSteps
    Call ProcessSlidesByKeywords("0_Info_Course_CopyrightYear", "", saDelete, False, 1)
    currentStep = currentStep + 1

    ShowStep "Deleting Trigger - CurrentLayout", currentStep, totalSteps
    Call ProcessSlidesByKeywords("0_Info_CurrentLayout", "", saDelete, False, 1)
    currentStep = currentStep + 1

    ShowStep "Deleting Variable - Industry", currentStep, totalSteps
    Call ProcessSlidesByKeywords("0_Info_Course_Industry", "", saDelete, False, 1)
    currentStep = currentStep + 1

    ShowStep "Deleting Variable - Language", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Trigger - Set Variable : 0_Info_Course_Language", "", saDelete, False, 1)
    currentStep = currentStep + 1

    ShowStep "Deleting Course Menu Entries", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Menu Item", "", saDelete, False, 1)
    currentStep = currentStep + 1

    ShowStep "Deleting Slide Notes", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Slide Notes", "", saDelete, False, 1)
    currentStep = currentStep + 1

    ShowStep "Deleting Variable - Course Version", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Trigger - Set Variable : 0_Info_Course_Version", "", saDelete, False, 1)
    currentStep = currentStep + 1

    ShowStep "Deleting Trigger - Set Status", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Trigger - Set Variable : 0_Status", "", saDelete, False, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Blank Variables", currentStep, totalSteps
    Application.Run "AutoTranslatePrep_BlankVariables_Highlight"
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Course Evaluation", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Course Evaluation", "", saPink, False, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Disclaimer", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Disclaimer", "", saPink, False, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Layer ID", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Layer ID", "", saPink, False, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Project Information", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Project Information", "", saPink, True, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Resources", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Resources", "", saPink, False, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Scene ID", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Scene ID", "", saPink, False, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Slide ID", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Slide ID", "", saPink, False, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Slide Master ID", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Slide Master ID", "", saPink, False, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Support", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Custom tab", "", saPink, False, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Table of Contents ID", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Table of Contents ID", "", saPink, False, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Template Text", currentStep, totalSteps
    Call ProcessSlidesByKeywords("[TEMPLATE]", "", saPink, False, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Variables Section", currentStep, totalSteps
    Call ProcessSlidesByKeywords("0_Password_Admin default value", "", saPink, True, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Project Variables ID", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Project variables ID", "", saPink, False, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Slide Name - Question Gallery", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Question Gallery", "Slide Name", saPink, False, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Slide Name - Question Slides", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Question", "Slide Name", saPink, False, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Scene Name - Quiz", currentStep, totalSteps
    Call ProcessSlidesByKeywords("quiz", "Scene Name", saPink, False, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Slide Name - Quiz", currentStep, totalSteps
    Call ProcessSlidesByKeywords("quiz", "Slide Name", saPink, False, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Slide Name - Results", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Results", "Slide Name", saPink, False, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Scene Name - Welcome", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Welcome", "Scene Name", saPink, False, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Slide Name - Welcome", currentStep, totalSteps
    Call ProcessSlidesByKeywords("Welcome", "Slide Name", saPink, False, 1)
    currentStep = currentStep + 1

    ShowStep "Pink Highlight - Left 2 Columns", currentStep, totalSteps
    Application.Run "AutoTranslatePrep_Left2Columns_Highlight"
    currentStep = currentStep + 1

    MsgBox "Doc prep complete!"
    Application.ScreenUpdating = True
End Sub

Private Sub ShowStep(stepName As String, stepNum As Long, total As Long)
    Application.StatusBar = "Step " & stepNum & " of " & total & ": " & stepName
    DoEvents
End Sub
